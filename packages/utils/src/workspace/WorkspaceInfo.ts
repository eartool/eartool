import * as Assert from "node:assert";
import PQueue from "p-queue";
import type { FilePath } from "../FilePath.js";
import type { PackageName } from "../PackageName.js";

export type DependencyDirection = "downstream" | "upstream" | "sideways";

export class PackageInfo {
  readonly name: PackageName;
  readonly packagePath: FilePath;
  readonly depsByName = new Map<PackageName, PackageInfo>();
  readonly depsByPath = new Map<FilePath, PackageInfo>();

  readonly inverseDepsByName = new Map<PackageName, PackageInfo>();
  readonly inverseDepsByPath = new Map<FilePath, PackageInfo>();

  #workspace: Workspace;

  constructor(workspace: Workspace, name: PackageName, packagePath: FilePath) {
    this.name = name;
    this.packagePath = packagePath;
    this.#workspace = workspace;
  }

  addDependency = (node: PackageInfo) => {
    this.depsByName.set(node.name, node);
    this.depsByPath.set(node.packagePath, node);

    node.inverseDepsByName.set(this.name, this);
    node.inverseDepsByPath.set(this.packagePath, this);
  };
}

type PackageLookupCriteria =
  | {
    name: PackageName;
    packagePath?: never;
  }
  | {
    name?: never;
    packagePath: FilePath;
  }
  | {
    name: PackageName;
    packagePath: FilePath;
  };

export type RunTaskCallback = (args: {
  packagePath: FilePath;
  packageName: PackageName;
}) => Promise<unknown>;

export class Workspace {
  #pathToNode = new Map<FilePath, PackageInfo>();
  #nameToNode = new Map<PackageName, PackageInfo>();

  public addPackage(name: PackageName, packagePath: FilePath) {
    const maybe = this.getPackageBy({ name, packagePath });
    if (maybe) return maybe;

    const node = new PackageInfo(this, name, packagePath);
    this.#pathToNode.set(packagePath, node);
    this.#nameToNode.set(name, node);
    return node;
  }

  public getPackageBy({ name, packagePath }: PackageLookupCriteria) {
    if (name && packagePath) {
      const maybe = [this.#pathToNode.get(packagePath), this.#nameToNode.get(name)];
      Assert.ok(maybe[0] === maybe[1]);
      return maybe[0];
    } else if (name) {
      return this.#nameToNode.get(name);
    } else if (packagePath) {
      return this.#pathToNode.get(packagePath);
    } else {
      Assert.fail();
    }
  }

  public getPackageByNameOrThrow(name: PackageName) {
    const ret = this.#nameToNode.get(name);
    Assert.ok(ret != null, `Expected to find a package named '${name}' but couldn't`);
    return ret;
  }

  public *nodesFor(lookups: (PackageInfo | PackageLookupCriteria)[]) {
    for (const lookup of lookups) {
      const s = lookup instanceof PackageInfo ? lookup : this.getPackageBy(lookup);
      if (!s) throw new Error("Invalid package");
      yield s;
    }
  }

  public *walkTreeDownstreamFrom(...lookups: (PackageInfo | PackageLookupCriteria)[]) {
    const visited = new Set<PackageInfo>();
    const toVisit: PackageInfo[] = [];

    if (lookups.length > 0) {
      toVisit.push(...this.nodesFor(lookups));
    } else {
      for (const packageInfo of this.#nameToNode.values()) {
        if (packageInfo.depsByName.size == 0) toVisit.push(packageInfo);
      }
    }

    while (toVisit.length > 0) {
      const cur = toVisit.shift()!;
      if (!visited.has(cur)) {
        visited.add(cur);
        yield cur;

        toVisit.push(...cur.inverseDepsByName.values());
      }
    }
  }

  public getPackageDirToNameMap(): ReadonlyMap<FilePath, PackageName> {
    // TODO cache this?
    return new Map([...this.walkTreeDownstreamFrom()].map((a) => [a.packagePath, a.name] as const));
  }

  public getPackageDirection(fromName: PackageName, toName: PackageName): DependencyDirection {
    const from = this.#nameToNode.get(fromName);
    const to = this.#nameToNode.get(toName);

    Assert.ok(from != null);
    Assert.ok(to != null);

    for (const dir of ["downstream", "upstream"] as const) {
      for (const p of this.walk(fromName, dir)) {
        if (p.name === toName) {
          return dir;
        }
      }
    }

    return "sideways";
  }

  public *walk(fromName: PackageName, direction: "downstream" | "upstream" = "downstream") {
    const from = this.#nameToNode.get(fromName);
    Assert.ok(from != null);
    const visitedNames = new Set<PackageName>();
    const toVisit = [from];

    const subField = direction === "upstream" ? "depsByName" : "inverseDepsByName";

    while (toVisit.length > 0) {
      const p = toVisit.shift()!;
      visitedNames.add(p.name);
      yield p;

      for (const [name] of p[subField]) {
        if (!visitedNames.has(name)) toVisit.push(this.#nameToNode.get(name)!);
      }
    }
  }

  async runTasks(
    lookup: undefined | (PackageInfo | PackageLookupCriteria)[],
    order: "any" | "upstreamFirst",
    concurrency: number,
    performTask: RunTaskCallback,
  ) {
    const startNodes = lookup ? [...this.nodesFor(lookup)] : [];
    const statuses = this.#createInitialTaskStatuses(startNodes);

    const queue = new PQueue({ autoStart: true, concurrency });

    // Always do the start nodes first, regardless of ordering
    for (const node of startNodes) {
      createTaskIfReady(node);
    }

    // I think we can literally just do:
    // for (const packageInfo of this.walkTreeDownstreamFrom(...startNodes)) {
    //   // this won't schedule anything twice
    //   createTaskIfReady(packageInfo);
    // }

    if (order === "any") {
      // just add everything
      for (const packageInfo of this.walkTreeDownstreamFrom(...startNodes)) {
        // this won't schedule anything twice
        createTaskIfReady(packageInfo);
      }
    } else if (startNodes.length === 0) {
      // seed todo with projects that have no dependents
      for (const packageInfo of this.#nameToNode.values()) {
        if (packageInfo.depsByName.size == 0) {
          createTaskIfReady(packageInfo);
        }
      }
    }

    await queue.onIdle();

    function createTaskIfReady(node: PackageInfo) {
      if (
        statuses.get(node) === "todo"
        && (allDepsOfPackagePathSatisfied(node) || order == "any")
      ) {
        statuses.set(node, "scheduled");
        queue.add(async () => {
          await performTask({
            packagePath: node.packagePath,
            packageName: node.name,
          });
          statuses.set(node, "complete");
          for (const dependentNode of node.inverseDepsByName.values()) {
            createTaskIfReady(dependentNode);
          }
        });
      }
    }

    function allDepsOfPackagePathSatisfied(node: PackageInfo) {
      for (const packageInfo of node.depsByName.values()) {
        const status = statuses.get(packageInfo);
        if (status !== "complete" && status !== "skipped") {
          return false;
        }
      }
      return true;
    }
  }

  #createInitialTaskStatuses(startNodes: PackageInfo[]) {
    const statuses = new Map<PackageInfo, "skipped" | "scheduled" | "complete" | "todo">();
    // we manually set todo in the skipped case
    for (const packageInfo of this.#nameToNode.values()) {
      statuses.set(packageInfo, startNodes.length > 0 ? "skipped" : "todo");
    }
    if (startNodes.length > 0) {
      for (const packageDir of this.walkTreeDownstreamFrom(...startNodes)) {
        statuses.set(packageDir, "todo");
      }
    }
    return statuses;
  }
}

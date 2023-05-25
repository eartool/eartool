import { filterPkgsBySelectorObjects } from "@pnpm/filter-workspace-packages";
import PQueue from "p-queue";
import { findWorkspacePackagesNoCheck } from "@pnpm/find-workspace-packages";
import * as Assert from "assert";

export class Node {
  name: string;
  packagePath: string;
  depsByName = new Map<string, Node>();
  depsByPath = new Map<string, Node>();

  inverseDepsByName = new Map<string, Node>();
  inverseDepsByPath = new Map<string, Node>();

  #workspace: Workspace;

  constructor(workspace: Workspace, name: string, packagePath: string) {
    this.name = name;
    this.packagePath = packagePath;
    this.#workspace = workspace;
  }

  addDependency = (node: Node) => {
    this.depsByName.set(node.name, node);
    this.depsByPath.set(node.packagePath, node);

    node.inverseDepsByName.set(this.name, this);
    node.inverseDepsByPath.set(this.packagePath, this);
  };
}

type PackageLookupCriteria =
  | {
      name: string;
      packagePath?: never;
    }
  | {
      name?: never;
      packagePath: string;
    }
  | {
      name: string;
      packagePath: string;
    };

export class Workspace {
  #pathToNode = new Map<string, Node>();
  #nameToNode = new Map<string, Node>();

  public addPackage(name: string, packagePath: string) {
    const maybe = this.getPackageBy({ name, packagePath });
    if (maybe) return maybe;

    const node = new Node(this, name, packagePath);
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

  public *walkTreeDownstreamFromName(lookup?: Node | PackageLookupCriteria) {
    const startNode = lookup
      ? lookup instanceof Node
        ? lookup
        : this.getPackageBy(lookup)
      : undefined;

    const visited = new Set<Node>();
    const toVisit: Node[] = [];

    if (startNode) {
      toVisit.push(startNode);
    } else {
      for (const q of this.#nameToNode.values()) {
        if (q.depsByName.size == 0) toVisit.push(q);
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

  async runTasksInOrder(
    lookup: Node | PackageLookupCriteria | undefined,
    performTask: (args: { packagePath: string; packageName: string }) => Promise<unknown>
  ) {
    const startNode = lookup
      ? lookup instanceof Node
        ? lookup
        : this.getPackageBy(lookup)
      : undefined;

    const statuses = new Map<Node, "skipped" | "scheduled" | "complete" | "todo">();

    const queue = new PQueue({ autoStart: true, concurrency: 6 });

    // we manually set todo in the skipped case
    for (const q of this.#nameToNode.values()) {
      statuses.set(q, startNode ? "skipped" : "todo");
    }

    if (startNode) {
      for (const packageDir of this.walkTreeDownstreamFromName(startNode)) {
        statuses.set(packageDir, "todo");
      }
      queue.add(createTask(startNode));
    } else {
      // seed todo with projects that have no dependents
      for (const q of this.#nameToNode.values()) {
        if (q.depsByName.size == 0) {
          queue.add(createTask(q));
        }
      }
    }

    await queue.onIdle();

    for (const [node, status] of statuses) {
      if (status !== "complete" && status !== "skipped") {
        debugPrintStatuses(statuses);
        throw new Error("Failed");
      }
    }

    function createTask(node: Node) {
      statuses.set(node, "scheduled");
      return async () => {
        await performTask({
          packagePath: node.packagePath,
          packageName: node.name,
        });
        statuses.set(node, "complete");
        for (const dependentNode of node.inverseDepsByName.values()) {
          if (
            statuses.get(dependentNode) === "todo" &&
            allDepsOfPackagePathSatisified(dependentNode)
          ) {
            queue.add(createTask(dependentNode));
          }
        }
      };
    }

    function allDepsOfPackagePathSatisified(node: Node) {
      for (const q of node.depsByName.values()) {
        const status = statuses.get(q);
        if (status !== "complete" && status !== "skipped") {
          return false;
        }
      }
      return true;
    }
  }
}

function getNames(toVisit: Node[] | Set<Node> | IterableIterator<Node>): any {
  return [...toVisit].map((a) => a.name);
}

function debugPrintStatuses(statuses: Map<Node, "skipped" | "scheduled" | "complete" | "todo">) {
  console.log([...statuses.entries()].map((a) => [a[0].name, a[1]]));
}

export async function createWorkspaceInfo(workspaceDir: string) {
  const allProjects = await findWorkspacePackagesNoCheck(workspaceDir);
  const { allProjectsGraph } = await filterPkgsBySelectorObjects(allProjects, [], { workspaceDir });

  const workspace = new Workspace();
  const nodes = allProjects.map((p) => workspace.addPackage(p.manifest.name!, p.dir));

  for (const node of nodes) {
    for (const dep of allProjectsGraph[node.packagePath]!.dependencies) {
      const depNode = workspace.getPackageBy({ packagePath: dep });
      Assert.ok(depNode);

      node.addDependency(depNode);
    }
  }

  return workspace;
}

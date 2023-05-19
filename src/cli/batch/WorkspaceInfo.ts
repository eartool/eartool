import { filterPkgsBySelectorObjects, type PackageGraph } from "@pnpm/filter-workspace-packages";
import { SetMultimap } from "@teppeis/multimaps";
import PQueue from "p-queue";
import type { PackageNode } from "@pnpm/workspace.pkgs-graph";
import {
  findWorkspacePackagesNoCheck,
  type Project as PnpmProject,
} from "@pnpm/find-workspace-packages";

class WorkspaceInfo {
  #allProjects: PnpmProject[];
  #allProjectsGraph: PackageGraph<PnpmProject>;
  #pathProjectGraph: Map<string, PackageNode<PnpmProject>>;
  #pathToDependents: SetMultimap<string, string>;

  constructor(allProjects: PnpmProject[], allProjectsGraph: PackageGraph<PnpmProject>) {
    this.#allProjects = allProjects;
    this.#allProjectsGraph = allProjectsGraph;

    this.#pathProjectGraph = new Map(Object.entries(this.#allProjectsGraph));
    this.#pathToDependents = new SetMultimap<string, string>();

    for (const [path, value] of this.#pathProjectGraph) {
      this.#pathToDependents.putAll(path, new Set());
      for (const dependency of value.dependencies) {
        this.#pathToDependents.put(dependency, path);
      }
    }
  }

  public getPackagePathForName(projectName: string) {
    for (const [packagePath, t] of this.#pathProjectGraph) {
      if (t.package.manifest.name === projectName) {
        return packagePath;
      }
    }
    throw new Error("Couldnt find package");
  }

  public *walkTreeDownstreamFromName(projectName?: string) {
    const visited = new Set<string>();
    const toVisit: string[] = [];

    if (projectName) {
      const start = this.getPackagePathForName(projectName);
      toVisit.push(start);
    } else {
      for (const [projectPath, packageNode] of this.#pathProjectGraph.entries()) {
        if (packageNode.dependencies.length == 0) {
          toVisit.push(projectPath);
        }
      }
    }

    while (toVisit.length > 0) {
      const next = toVisit.shift()!;
      if (!visited.has(next)) {
        visited.add(next);
        yield next;

        toVisit.push(...Array.from(this.#pathToDependents.get(next)));
      }
    }
  }

  async runTasksInOrder(
    startProjectName: string | undefined,
    createTaskCallback: (args: { packagePath: string; packageName: string }) => Promise<unknown>
  ) {
    const self = this;
    const pathToDependents = this.#pathToDependents;

    const scheduled = new Set<string>();
    const queue = new PQueue({ autoStart: true, concurrency: 6 });

    // seed todo with projects that have no dependents
    if (startProjectName) {
      const packagePath = this.getPackagePathForName(startProjectName);
      queue.add(createTask(packagePath));
    } else {
      for (const [projectPath, value] of this.#pathProjectGraph.entries()) {
        if (value.dependencies.length == 0) {
          queue.add(createTask(projectPath));
        }
      }
    }

    await queue.onIdle();

    function createTask(projectPath: string) {
      scheduled.add(projectPath);
      return async () => {
        await createTaskCallback({
          packagePath: projectPath,
          packageName: self.getNameFromPath(projectPath)!,
        });
        for (const maybe of pathToDependents.get(projectPath)) {
          if (!scheduled.has(maybe)) {
            queue.add(createTask(maybe));
          }
        }
      };
    }
  }

  getDownStreamProjectsFromName = (projectName?: string) => {
    return Array.from(this.walkTreeDownstreamFromName(projectName));
  };

  getNameFromPath = (packagePath: string) => {
    return this.#pathProjectGraph.get(packagePath)?.package.manifest.name;
  };
}

export async function createWorkspaceInfo(workspaceDir: string) {
  const allProjects = await findWorkspacePackagesNoCheck(workspaceDir);
  const { allProjectsGraph } = await filterPkgsBySelectorObjects(allProjects, [], { workspaceDir });

  return new WorkspaceInfo(allProjects, allProjectsGraph);
}

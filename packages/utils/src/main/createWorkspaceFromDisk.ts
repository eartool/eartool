import * as Assert from "assert";
import { filterPkgsBySelectorObjects } from "@pnpm/filter-workspace-packages";
import { findWorkspacePackagesNoCheck } from "@pnpm/find-workspace-packages";
import { Workspace } from "./WorkspaceInfo.js";

export async function createWorkspaceFromDisk(workspaceDir: string) {
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

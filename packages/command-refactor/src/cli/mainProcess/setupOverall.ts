import { createWorkspaceInfo } from "@eartool/batch";
import { maybeLoadProject } from "@eartool/utils";
import type { PackageExportRename } from "@eartool/replacements";
import type { PackageName } from "./PackageName.js";
import { calculatePackageExportRenamesForFileMoves } from "./calculatePackageExportRenamesForFileMoves.js";
import { getFileContentsRelatively } from "./getFileContentsRelatively.js";
import * as Assert from "assert";

export async function setupOverall(
  workspaceDir: string,
  filesToMove: Set<string>,
  destinationModule: string
) {
  const packagePathToFilesToMove = groupByPackages(filesToMove);

  // Supposing a -> b -> c, where `->` means "depends on"
  // We can move b to c, but we need to update a to depend on c
  abortIfNotPushUpstream();

  const workspace = await createWorkspaceInfo(workspaceDir);

  const rootExportsToMove = new Map<PackageName, PackageExportRename[]>();
  const fileContents = new Map</* relPath */ string, string>();

  await workspace.runTasksInOrder([], async ({ packageName, packagePath }) => {
    const project = maybeLoadProject(packagePath);
    if (!project) return;

    const packageExportRenames = calculatePackageExportRenamesForFileMoves(
      project,
      filesToMove,
      packagePath,
      destinationModule
    );

    if (packageExportRenames?.length > 0) {
      rootExportsToMove.set(packageName, packageExportRenames);
    }

    const q = getFileContentsRelatively(project, packagePath, filesToMove);
    for (const [relPath, contents] of q) {
      Assert.ok(!q.has(relPath));

      fileContents.set(relPath, contents);
    }
  });

  return { rootExportsToMove, fileContents };
}

function groupByPackages(files: Set<string>): Map<string, Set<string>> {
  throw new Error("Function not implemented.");
}
function abortIfNotPushUpstream() {
  throw new Error("Function not implemented.");
}

function prepIt(q: Set<string>) {
  // const consumedExports = getConsumedExports(q);

  throw new Error("Function not implemented.");
}
function doExtraWork() {
  throw new Error("Function not implemented.");
}

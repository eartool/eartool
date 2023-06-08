import type { DependencyDirection, Workspace } from "@eartool/batch";
import type { PackageExportRename } from "@eartool/replacements";
import type { PackageName } from "./PackageName.js";
import { calculatePackageExportRenamesForFileMoves } from "./calculatePackageExportRenamesForFileMoves.js";
import { getFileContentsRelatively } from "./getFileContentsRelatively.js";
import * as Assert from "assert";
import type { Project } from "ts-morph";
import type { FilePath } from "@eartool/utils";
import { mapFilesByPackageName } from "./mapFilesByPackageName.js";
import type { Logger } from "pino";

export type TsMorphProjectLoader = (packagePath: string) => Project | undefined;

export async function setupOverall(
  workspace: Workspace,
  projectLoader: TsMorphProjectLoader,
  filesToMove: Set<string>,
  destinationModule: string,
  logger: Logger
): Promise<{
  rootExportsToMove: Map<PackageName, PackageExportRename[]>;
  fileContents: Map<FilePath, string>;
}> {
  // Throws if we can't predict the package
  const packageNameToFilesToMove = mapFilesByPackageName(workspace, filesToMove);

  const destinationDirections = new Set(
    [...packageNameToFilesToMove.keys()].map((k) =>
      workspace.getPackageDirection(k, destinationModule)
    )
  );

  if (destinationDirections.size > 1) {
    throw new Error("Can only handle a single direction right now");
  }

  // Dealing with an ANY here FIXME
  const direction: DependencyDirection = destinationDirections.values().next().value;
  logger.trace("Direction %s", direction);

  // Supposing a -> b -> c, where `->` means "depends on"
  // We can move b to c, but we need to update a to depend on c

  const rootExportsToMove = new Map<PackageName, PackageExportRename[]>();
  const fileContents = new Map</* relPath */ FilePath, string>();

  for (const [packageName, files] of packageNameToFilesToMove.asMap()) {
    const packagePath = workspace.getPackageBy({ name: packageName })!.packagePath;
    const project = projectLoader(packagePath);
    Assert.ok(project);

    const { packageExportRenames, allFilesToMove } = calculatePackageExportRenamesForFileMoves(
      project,
      files,
      packagePath,
      destinationModule,
      direction
    );

    if (packageExportRenames?.length > 0) {
      rootExportsToMove.set(packageName, packageExportRenames);
    }

    for (const [relPath, contents] of getFileContentsRelatively(
      project,
      packagePath,
      allFilesToMove
    )) {
      Assert.ok(!fileContents.has(relPath));

      fileContents.set(relPath, contents);
    }
  }

  // await workspace.runTasksInOrder([], async ({ packageName, packagePath }) => {});

  return { rootExportsToMove, fileContents };
}

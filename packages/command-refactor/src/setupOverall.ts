import type { DependencyDirection, Workspace } from "@eartool/batch";
import type { PackageExportRename } from "@eartool/replacements";
import type { FilePath, PackageJson } from "@eartool/utils";
import { readPackageJson } from "@eartool/utils";
import * as Assert from "node:assert";
import type { Logger } from "pino";
import type { FileSystemHost, Project } from "ts-morph";
import { mergePackageJsonDeps, type PackageJsonDepsRequired } from "./PackageJsonDepsRequired.js";
import type { PackageName } from "./PackageName.js";
import { calculatePackageExportRenamesForFileMoves } from "./calculatePackageExportRenamesForFileMoves.js";
import { getFileContentsRelatively } from "./getFileContentsRelatively.js";
import { mapFilesByPackageName } from "./mapFilesByPackageName.js";

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
  packageJsonDepsRequired: PackageJsonDepsRequired;
  direction: DependencyDirection;
  primaryPackages: Set<PackageName>;
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
  logger.trace("Direction to move: %s", direction);

  // Supposing a -> b -> c, where `->` means "depends on"
  // We can move b to c, but we need to update a to depend on c

  const rootExportsToMove = new Map<PackageName, PackageExportRename[]>();
  const fileContents = new Map</* relPath */ FilePath, string>();

  const packageJsonDepsRequired: PackageJsonDepsRequired = {
    dependencies: new Map(),
    devDependencies: new Map(),
  };

  for (const [packageName, files] of packageNameToFilesToMove.asMap()) {
    logger.debug("setupOverall for %s", packageName);
    const packagePath = workspace.getPackageByNameOrThrow(packageName)!.packagePath;
    const project = projectLoader(packagePath);
    Assert.ok(project);

    const { packageExportRenames, allFilesToMove, requiredPackages } =
      calculatePackageExportRenamesForFileMoves(
        project,
        files,
        packagePath,
        destinationModule,
        direction,
        logger
      );

    logger.debug(
      "packageExportRenames: %o",
      packageExportRenames.map((a) => `${a.from} to package ${a.toFileOrModule}`).join("\n")
    );
    logger.debug("allFilesToMove: %o", [...allFilesToMove]);
    logger.debug("requiredPackages: %o", [...requiredPackages]);

    const versions = getPackageVersions(
      project.getFileSystem(),
      packagePath,
      requiredPackages,
      logger
    );
    mergePackageJsonDeps({ from: versions, into: packageJsonDepsRequired });

    if (packageExportRenames?.length > 0) {
      rootExportsToMove.set(packageName, packageExportRenames);
    }

    // TODO this is overkill now that we group by package
    for (const [relPath, contents] of getFileContentsRelatively(
      project,
      packagePath,
      allFilesToMove
    )) {
      Assert.ok(!fileContents.has(relPath));

      fileContents.set(relPath, contents);
    }
  }

  const primaryPackages = new Set([...packageNameToFilesToMove.keys(), destinationModule]);

  // await workspace.runTasksInOrder([], async ({ packageName, packagePath }) => {});

  return { rootExportsToMove, fileContents, packageJsonDepsRequired, direction, primaryPackages };
}

function getPackageVersions(
  fileSystem: FileSystemHost,
  packagePath: string,
  requiredPackages: Set<PackageName>,
  logger: Logger
) {
  const packageFile: PackageJson = readPackageJson(fileSystem, packagePath);

  const ret = {
    dependencies: new Map<PackageName, string>(),
    devDependencies: new Map<PackageName, string>(),
  };

  for (const depName of requiredPackages) {
    let success = false;
    for (const depType of ["dependencies", "devDependencies"] as const) {
      if (assignDepVersion(packageFile, depType, depName, ret)) success = true;
      if (assignDepVersion(packageFile, depType, `@types/${depName}`, ret)) success = true;
    }
    if (!success) {
      logger.warn("Failed to find a dependency version for `%s`", depName);
    }
  }

  return ret;
}
function assignDepVersion(
  packageFile: PackageJson,
  depType: "dependencies" | "devDependencies",
  depName: PackageName,
  ret: { dependencies: Map<PackageName, string>; devDependencies: Map<PackageName, string> }
) {
  const maybeVersion = packageFile[depType]?.[depName];

  if (maybeVersion) {
    ret[depType].set(depName, maybeVersion);
    return true;
  }
  return false;
}
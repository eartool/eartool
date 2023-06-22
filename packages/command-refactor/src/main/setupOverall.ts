import * as Assert from "node:assert";
import type { PackageExportRename } from "@eartool/replacements";
import { mergePackageJsonDeps, readPackageJson } from "@eartool/utils";
import type {
  DependencyDirection,
  FilePath,
  PackageJson,
  PackageName,
  Workspace,
  type PackageJsonDepsRequired,
} from "@eartool/utils";
import type { SetMultimap } from "@teppeis/multimaps";
import type { Logger } from "pino";
import type { FileSystemHost, Project } from "ts-morph";
import { SymbolRenames } from "./SymbolRenames.js";
import { calculatePackageExportRenamesForFileMoves } from "./calculatePackageExportRenamesForFileMoves.js";
import { getFileContentsRelatively } from "./getFileContentsRelatively.js";
import { mapFilesByPackageName } from "./mapFilesByPackageName.js";

export type TsMorphProjectLoader = (packagePath: string) => Project | undefined;

export type RelativeFileInfo = {
  fileContents: string;
  rootExports: Map<string, string>;
};

export interface SetupResults {
  packageExportRenamesMap: Map<PackageName | FilePath, PackageExportRename[]>;
  relativeFileInfoMap: Map<FilePath, RelativeFileInfo>;
  packageJsonDepsRequired: PackageJsonDepsRequired;
  direction: DependencyDirection;
  primaryPackages: Set<PackageName>;
  packageNameToFilesToMove: SetMultimap<PackageName, FilePath>;
}

export async function setupOverall(
  workspace: Workspace,
  projectLoader: TsMorphProjectLoader,
  filesToMove: Set<string>,
  destinationModule: string,
  logger: Logger
): Promise<SetupResults> {
  // Throws if we can't predict the package
  const packageNameToFilesToMove = mapFilesByPackageName(workspace, filesToMove);

  if (!workspace.getPackageBy({ name: destinationModule })) {
    logger.fatal(`Cannot find package named '${destinationModule}'`);
    throw new Error(`Cannot find package named '${destinationModule}'`);
  }

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

  // const packageExportRenamesMap: PackageExportRenames = new Map();
  const renames = new SymbolRenames();
  const relativeFileInfoMap = new Map<FilePath, RelativeFileInfo>();

  const packageJsonDepsRequired: PackageJsonDepsRequired = {
    dependencies: new Map(),
    devDependencies: new Map(),
  };

  for (const [packageName, files] of packageNameToFilesToMove.asMap()) {
    logger.debug("setupOverall for %s", packageName);
    const packagePath = workspace.getPackageByNameOrThrow(packageName)!.packagePath;
    const project = projectLoader(packagePath);
    Assert.ok(project);

    const { allFilesToMove, requiredPackages, rootExportsPerRelativeFilePath } =
      calculatePackageExportRenamesForFileMoves(
        project,
        files,
        packagePath,
        packageName,
        destinationModule,
        direction,
        renames,
        logger
      );

    logger.debug(
      "packageExportRenames: %o",
      [...renames.asRaw()].map(([filePathOrModule, renames]) =>
        renames
          .map((a) => `${filePathOrModule}: ${a.from} to package ${a.toFileOrModule}`)
          .join("\n")
      )
    );
    logger.debug("allFilesToMove: %o", [...allFilesToMove]);
    logger.debug("requiredPackages: %o", [...requiredPackages]);
    logger.debug(
      "rootExportsPerRelativeFilePath %o",
      [...rootExportsPerRelativeFilePath].map(([a, b]) => [a, [...b]])
    );

    const versions = getPackageVersions(
      project.getFileSystem(),
      packagePath,
      requiredPackages,
      logger
    );
    mergePackageJsonDeps({ from: versions, into: packageJsonDepsRequired });

    // TODO this is overkill now that we group by package
    for (const [relPath, contents] of getFileContentsRelatively(
      project,
      packagePath,
      allFilesToMove
    )) {
      Assert.ok(!relativeFileInfoMap.has(relPath));
      relativeFileInfoMap.set(relPath, {
        fileContents: contents,
        rootExports: rootExportsPerRelativeFilePath.get(relPath) ?? new Map(),
      });
    }

    packageNameToFilesToMove.putAll(packageName, allFilesToMove);
  }

  const primaryPackages = new Set([...packageNameToFilesToMove.keys(), destinationModule]);

  // await workspace.runTasksInOrder([], async ({ packageName, packagePath }) => {});

  // if packageJsonDepsRequired has an entry that has destination in its walk, we fail
  const q = new Set([
    ...packageJsonDepsRequired.dependencies.keys(),
    ...packageJsonDepsRequired.devDependencies.keys(),
  ]);

  // we could probably do this next part faster with some memoization!
  for (const up of workspace.walk(destinationModule, "downstream")) {
    if (up.name === destinationModule) continue;

    if (q.has(up.name)) {
      throw new Error(
        `Cannot complete task. It would create a circular dependency as the destination '${destinationModule}' is upstream of a dependency it would have to take: '${up.name}'`
      );
    }
  }
  for (const asdf of q) {
    workspace.walk(asdf);
  }

  return {
    packageExportRenamesMap: renames.asRaw(),
    relativeFileInfoMap,
    packageJsonDepsRequired,
    direction,
    primaryPackages,

    packageNameToFilesToMove,
  };
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
      if (depName.startsWith("node:") && assignDepVersion(packageFile, depType, "@types/node", ret))
        success = true;
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

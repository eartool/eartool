// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./iterator.d.ts" />

import type { PackageExportRename } from "@eartool/replacements";
import {
  dropDtsFiles,
  getAllImportsAndExports,
  getRootFile,
  mergePackageJsonDeps,
  readPackageJson,
} from "@eartool/utils";
import type {
  DependencyDirection,
  Export,
  ExportAlias,
  FilePath,
  PackageContext,
  PackageJson,
  PackageJsonDepsRequired,
  PackageName,
  Workspace,
} from "@eartool/utils";
import type { SetMultimap } from "@teppeis/multimaps";
import Iterator from "core-js-pure/actual/iterator/index.js";
import * as Assert from "node:assert";
import path from "node:path";
import * as util from "node:util";
import type { Logger } from "pino";
import type { FileSystemHost, Project } from "ts-morph";
import { prettyStringForPackageExportRenamesMap } from "../worker/processPackageReplacements.js";
import { calculatePackageExportRenamesForFileMoves, type Info } from "./calculatePackageExportRenamesForFileMoves.js";
import { getFileContentsRelatively } from "./getFileContentsRelatively.js";
import { mapFilesByPackageName } from "./mapFilesByPackageName.js";
import { SymbolRenames } from "./SymbolRenames.js";

export type TsMorphProjectLoader = (packagePath: string, logger: Logger) => Project | undefined;

export type RelativeFileInfo = {
  fileContents: string;
  rootExports: Map<string, Info>;
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
  logger: Logger,
): Promise<SetupResults> {
  // Throws if we can't predict the package
  const packageNameToFilesToMove = mapFilesByPackageName(workspace, filesToMove);

  if (!workspace.getPackageBy({ name: destinationModule })) {
    logger.fatal(`Cannot find package named '${destinationModule}'`);
    throw new Error(`Cannot find package named '${destinationModule}'`);
  }

  const destinationDirections = new Set(
    [...packageNameToFilesToMove.keys()].map((k) => workspace.getPackageDirection(k, destinationModule)),
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
    const project = projectLoader(packagePath, logger);
    Assert.ok(project);
    dropDtsFiles(project);

    const packageCtx: PackageContext = {
      logger,
      packageName,
      packagePath,
      project,
      packageJson: JSON.parse(
        project.getFileSystem().readFileSync(path.join(packagePath, "package.json")),
      ),
    };

    const { allFilesToMove, requiredPackages, rootExportsPerRelativeFilePath } =
      calculatePackageExportRenamesForFileMoves(
        packageCtx,
        files,
        destinationModule,
        direction,
        renames,
      );

    logger.debug(
      {
        allFilesToMove: [...allFilesToMove],
        requiredPackages: [...requiredPackages],
      },
      "packageExportRenames: \n%s",
      prettyStringForPackageExportRenamesMap(renames.asRaw(), { packagePath }),
    );

    const versions = getPackageVersions(
      project.getFileSystem(),
      packagePath,
      requiredPackages,
      logger,
    );
    mergePackageJsonDeps({ from: versions, into: packageJsonDepsRequired });

    logger.debug({ allFilesToMove: [...allFilesToMove] }, "wat");

    // TODO this is overkill now that we group by package
    for (
      const [relPath, contents] of getFileContentsRelatively(
        project,
        packagePath,
        allFilesToMove,
      )
    ) {
      logger.trace("Adding %s to relativeFileInfoMap", relPath);
      Assert.ok(!relativeFileInfoMap.has(relPath));

      const rootFile = getRootFile(packageCtx.project);

      const exportsFromRootToMove = new Map(
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        Iterator.from(getAllImportsAndExports(packageCtx).get(rootFile!.getFilePath())?.exports!)
          .filter(isAliasEntry)
          .filter(([, exportAlias]) => exportAlias.targetFile === path.join(packagePath, relPath))
          .map(([, exportAlias]) => [
            exportAlias.targetName,
            {
              exportName: [exportAlias.name!],
              isType: exportAlias.type === "alias" ? exportAlias.isType : false,
              originFile: exportAlias.targetFile,
            },
          ]),
      );

      const importsThatDidNotMove = new Map<string, Info>(
        Iterator.from(getAllImportsAndExports(packageCtx))
          .filter(([, a]) => !allFilesToMove.has(a.filePath))
          .flatMap(([, metadata]) =>
            Iterator.from(metadata.imports)
              .filter(([, { targetFile }]) => targetFile === path.join(packagePath, relPath))
              // .map(([k, i]) => [k, i] as const)
              .map<[string, Info]>(([k, v]) => [
                k,
                { exportName: [v.targetName], isType: v.isType, originFile: v.targetFile },
              ])
          ),
      );

      for (const [ogName, info] of exportsFromRootToMove) {
        importsThatDidNotMove.set(ogName, info);
      }

      logger.trace(`importsThatDidNotMove: %s`, util.inspect(importsThatDidNotMove));

      relativeFileInfoMap.set(relPath, {
        fileContents: contents,
        rootExports: rootExportsPerRelativeFilePath.get(relPath)!,
      });
    }

    packageNameToFilesToMove.putAll(packageName, allFilesToMove);
  }

  const primaryPackages = new Set([...packageNameToFilesToMove.keys(), destinationModule]);

  // if packageJsonDepsRequired has an entry that has destination in its walk, we fail
  const deps = new Set([
    ...packageJsonDepsRequired.dependencies.keys(),
    ...packageJsonDepsRequired.devDependencies.keys(),
  ]);

  // we could probably do this next part faster with some memoization!
  for (const up of workspace.walk(destinationModule, "downstream")) {
    if (up.name === destinationModule) continue;

    if (deps.has(up.name)) {
      throw new Error(
        `Cannot complete task. It would create a circular dependency as the destination '${destinationModule}' is upstream of a dependency it would have to take: '${up.name}'`,
      );
    }
  }
  for (const packageName of deps) {
    workspace.walk(packageName);
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
  logger: Logger,
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
      if (
        depName.startsWith("node:")
        && assignDepVersion(packageFile, depType, "@types/node", ret)
      ) {
        success = true;
      }
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
  ret: { dependencies: Map<PackageName, string>; devDependencies: Map<PackageName, string> },
) {
  const maybeVersion = packageFile[depType]?.[depName];

  if (maybeVersion) {
    ret[depType].set(depName, maybeVersion);
    return true;
  }
  return false;
}

export function isAlias(a: Export | ExportAlias): a is ExportAlias {
  return a.type === "alias";
}

export function isAliasEntry(x: [string, Export | ExportAlias]): x is [string, ExportAlias] {
  return isAlias(x[1]);
}

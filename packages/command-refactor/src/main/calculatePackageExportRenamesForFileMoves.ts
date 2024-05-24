// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./iterator.d.ts" />
import Iterator from "core-js-pure/actual/iterator";

import type {
  DependencyDirection,
  ExportAlias,
  FilePath,
  Import,
  Metadata,
  PackageContext,
  PackageName,
} from "@eartool/utils";
import { getAllImportsAndExports, getRootFile } from "@eartool/utils";
import * as path from "node:path";
import * as util from "node:util";
import { loggableMapMap } from "./loggableMapMap.js";
import { isAliasEntry } from "./setupOverall.js";
import type { SymbolRenames } from "./SymbolRenames.js";

const packageNameRegex = /^((@[a-zA-Z0-9_-]+\/)?[.a-zA-Z0-9_-]+)/;

export interface Info {
  exportName: string[];
  isType: boolean;
}

/**
 * Ignores files that aren't in the project
 *
 * @param project
 * @param filesToMove
 * @param packagePath
 * @param destinationModule
 * @returns
 */
export function calculatePackageExportRenamesForFileMoves(
  ctx: PackageContext,
  filesToMove: Iterable<FilePath>,
  destinationModule: PackageName,
  direction: DependencyDirection,
  renames: SymbolRenames,
): {
  allFilesToMove: Set<FilePath>;
  requiredPackages: Set<PackageName>;
  rootExportsPerRelativeFilePath: Map<FilePath, Map<string, Info>>;
} {
  // pre-seed
  const allImportsAndExports = getAllImportsAndExports(ctx);

  const requiredPackages = new Set<PackageName>();

  const visitedFiles = new Set<FilePath>();
  const toVisit = [...filesToMove];

  const rootExportsPerRelativeFilePath = new Map<FilePath, Map<string, Info>>();
  const { project, packagePath } = ctx;

  while (toVisit.length > 0) {
    const curFilePath = toVisit.shift()!;
    const curFileImportsAndExports = allImportsAndExports.get(curFilePath);
    if (!curFileImportsAndExports) {
      throw new Error(`File not found in importsAndExports: ${curFilePath}`);
    }

    const logger = ctx.logger.child({ curFilePath });
    if (visitedFiles.has(curFilePath)) continue;

    visitedFiles.add(curFilePath);
    logger.trace(
      {
        renames: Object.fromEntries([...renames.asRaw().entries()]),
        rootExportsPerRelativeFilePath: loggableMapMap(rootExportsPerRelativeFilePath),
      },
      "Visiting file: %s",
      curFilePath,
    );

    const sf = project.getSourceFile(curFilePath);
    if (!sf) continue;

    logger.trace(
      {
        renames: Object.fromEntries([...renames.asRaw().entries()]),
        rootExportsPerRelativeFilePath: loggableMapMap(rootExportsPerRelativeFilePath),
      },
      "Following addExistingRenamesForRootExport",
    );

    // FIXME TODO future we also need to deal with submodule imports
    // We need to deal with all the places that we import something from the destination
    for (const decl of sf
      .getImportDeclarations()
      .filter((a) => a.getModuleSpecifierValue() === destinationModule)) {
      if (decl.getNamespaceImport()) {
        throw new Error(
          `We don't currently handle namespace imports. See file: ${sf.getFilePath()}`,
        );
      }
    }

    // Update packages we need
    for (const [, { moduleSpecifier }] of curFileImportsAndExports.imports) {
      if (moduleSpecifier.startsWith(".")) continue;
      const depName = packageNameRegex.exec(moduleSpecifier)?.[0];
      if (!depName) continue;
      requiredPackages.add(depName);
    }

    // accumulate extra work
    if (direction == "upstream" || direction == "sideways") {
      // aka a -> b -> c, files in a move to b or c

      for (const type of ["imports", "exports"] as const) {
        for (const [, { targetFile, finalDest }] of curFileImportsAndExports[type] ?? []) {
          const finalTargetFile = finalDest?.targetFile ?? targetFile;
          logger.trace({ targetFile, finalDest, finalTargetFile }, "CheckingZZ ");
          if (finalTargetFile) {
            if (!visitedFiles.has(finalTargetFile)) toVisit.push(finalTargetFile);
          }
        }
      }
    }
  }

  // Now we need to figure out if there are additional exports needed in the new package
  // and local renames that may be needed here.
  for (const filePath of visitedFiles) {
    const rootExports = new Map();
    rootExportsPerRelativeFilePath.set(path.relative(packagePath, filePath), rootExports);

    const curMetadata = getAllImportsAndExports(ctx).get(filePath);
    for (const [x, exportOrExportAlias] of curMetadata!.exports) {
      ctx.logger.debug(
        { targetName: exportOrExportAlias.targetFile, x },
        "Adding rename for: %s",
        util.inspect(exportOrExportAlias),
      );
      renames.addRename(exportOrExportAlias.targetFile, {
        from: [exportOrExportAlias.name],
        toFileOrModule: destinationModule,
      });
      rootExports.set(exportOrExportAlias.targetName ?? exportOrExportAlias.name, {
        exportName: [exportOrExportAlias.name],
        isType:
          exportOrExportAlias.type === "type" ||
          (exportOrExportAlias.type === "alias" && exportOrExportAlias.isType),
        originFile: exportOrExportAlias.targetFile,
      });
    }

    for (const [x, exportAlias] of getExportsFromRoot(ctx, filePath)) {
      ctx.logger.debug(
        { targetName: exportAlias.targetFile, x },
        "Adding rename for: %s",
        util.inspect(exportAlias),
      );
      renames.addRename(ctx.packageName, {
        from: [exportAlias.name],
        toFileOrModule: destinationModule,
      });
      rootExports.set(exportAlias.targetName, {
        exportName: [exportAlias.name],
        isType: exportAlias.isType,
        originFile: exportAlias.targetFile,
      });
    }

    // if the importer is also moving, then we don't have to worry about re-exporting its deps
    for (const [otherFilePath, info] of getImportsThatDidNotMove(ctx, visitedFiles, filePath)) {
      for (const [x, importInfo] of info) {
        ctx.logger.debug(
          { otherFilePath, targetName: importInfo.targetFile, x },
          "Adding rename for: %s",
          util.inspect(importInfo),
        );

        renames.addRename(importInfo.targetFile!, {
          from: [importInfo.targetName],
          toFileOrModule: destinationModule,
        });

        rootExports.set(importInfo.targetName, {
          exportName: [importInfo.targetName],
          isType: importInfo.isType,
        });
      }
    }
  }

  return {
    allFilesToMove: visitedFiles,
    requiredPackages,
    rootExportsPerRelativeFilePath,
  };
}

function getImportsThatDidNotMove(
  ctx: PackageContext,
  ignoreFiles: Set<string>,
  filePath: FilePath,
) {
  const importsAndExportsExcludingIgnored = Iterator.from(getAllImportsAndExports(ctx)).filter(
    ([, metadata]) => !ignoreFiles.has(metadata.filePath),
  );

  // collect all the imports from files that didn't move
  const importsThatDidNotMove = importsAndExportsExcludingIgnored.map<
    [FilePath, Iterator<[string, Import]>]
  >(([fp, metadata]) => [
    fp,
    getImportsOriginatingFrom(metadata, filePath).map<[string, Import]>(
      ([, importInfo]: [string, Import]) => [metadata.filePath, importInfo],
    ),
  ]);
  return importsThatDidNotMove;
}

function getImportsOriginatingFrom(metadata: Metadata, filePath: string) {
  return Iterator.from(metadata.imports).filter(([, { targetFile }]) => targetFile === filePath);
}

function getExportsFromRoot(
  ctx: PackageContext,
  filePath: string,
): Iterator<[string, ExportAlias]> {
  const rootFile = getRootFile(ctx.project);

  const exportsFromRootToMove =
    // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
    Iterator.from(getAllImportsAndExports(ctx).get(rootFile!.getFilePath())?.exports!)
      .filter(isAliasEntry)
      .filter(([, { targetFile }]) => targetFile === filePath);

  return exportsFromRootToMove;
}

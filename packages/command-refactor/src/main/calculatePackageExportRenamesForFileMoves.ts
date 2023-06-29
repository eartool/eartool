import * as Assert from "node:assert";
import * as path from "node:path";
import type { DependencyDirection, FilePath, PackageName } from "@eartool/utils";
import type { Logger } from "pino";
import type { Project, SourceFile } from "ts-morph";
import { getRootFile } from "@eartool/utils";
import type { SymbolRenames } from "./SymbolRenames.js";
import { getConsumedExports as getConsumedImportsAndExports } from "./getConsumedExports.js";

const packageNameRegex = /^((@[a-zA-Z0-9_-]+\/)?[a-zA-Z0-9_-]+)/;

export interface Info {
  exportName: string;
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
  project: Project,
  filesToMove: Iterable<FilePath>,
  packagePath: FilePath,
  packageName: PackageName,
  destinationModule: PackageName,
  direction: DependencyDirection,
  renames: SymbolRenames,
  logger: Logger
): {
  allFilesToMove: Set<FilePath>;
  requiredPackages: Set<PackageName>;
  rootExportsPerRelativeFilePath: Map<FilePath, Map<string, Info>>;
} {
  // const packageExportRenames = new Map<string, PackageExportRename[]>();

  const requiredPackages = new Set<PackageName>();

  const visitedFiles = new Set<FilePath>();
  const toVisit = [...filesToMove];

  const rootExportsPerRelativeFilePath = new Map<FilePath, Map<string, Info>>();

  while (toVisit.length > 0) {
    const curFilePath = toVisit.shift()!;
    if (visitedFiles.has(curFilePath)) {
      continue;
    }
    visitedFiles.add(curFilePath);

    const sf = project.getSourceFile(curFilePath);
    if (!sf) continue;
    // in project only;

    // const renames: PackageExportRename[] = [];

    const rootExportsForSf = addExistingRenamesForRootExport(
      sf,
      packagePath,
      packageName,
      renames,
      destinationModule,
      logger
    );

    // if (renames.length > 0) {
    //   const q = packageExportRenames.get(packageName) ?? [];
    //   q.push(...renames);
    //   packageExportRenames.set(packageName, q);
    // }

    // TODO KILL THIS I DONT THINK ITS NEEDED NOW
    if (rootExportsForSf) {
      const curRelativeFilePath = path.relative(packagePath, sf.getFilePath());
      rootExportsPerRelativeFilePath.set(curRelativeFilePath, rootExportsForSf);
    }

    // this root export stuff is going to brea on renames FIXME

    // FIXME TODO future we also need to deal with submodule imports
    // We need to deal with all the places that we import something from the destination
    for (const decl of sf
      .getImportDeclarations()
      .filter((a) => a.getModuleSpecifierValue() === destinationModule)) {
      if (decl.getNamespaceImport()) {
        throw new Error(
          `We don't currently handle namespace imports. See file: ${sf.getFilePath()}`
        );
      }
    }

    // Update packages we need
    for (const literal of sf.getImportStringLiterals()) {
      if (literal.getLiteralText().startsWith(".")) continue;
      const depName = packageNameRegex.exec(literal.getLiteralText())?.[0];
      if (!depName) continue;
      requiredPackages.add(depName);
    }

    // accumulate extra work
    if (direction == "upstream" || direction == "sideways") {
      // aka a -> b -> c, files in a move to b or c

      for (const q of sf.getImportDeclarations()) {
        if (q.getModuleSpecifierValue().startsWith(".")) {
          const filePath = q.getModuleSpecifierSourceFile()?.getFilePath();
          Assert.ok(filePath, "How do we not have a filePath for this import: " + q.getText());
          if (!visitedFiles.has(filePath)) toVisit.push(filePath);
        }
      }
    }
  }

  // Now we need to figure out if there are additional exports needed in the new package
  // and local renames that may be needed here.
  for (const filePath of visitedFiles) {
    const sf = project.getSourceFileOrThrow(filePath);
    const consumed = getConsumedImportsAndExports(
      { logger, packageName, packagePath, project: sf.getProject() },
      sf
    );

    const usedSymbols = new Set<string>();
    for (const [otherFilePath, info] of consumed) {
      // If the file is moving with us, we don't need to consider it.
      if (visitedFiles.has(otherFilePath)) continue;
      for (const [exportedName] of info.imports) {
        // if (!usedSymbols.has(exportedName)) {
        usedSymbols.add(exportedName);
        renames.addRename(filePath, { from: [exportedName], toFileOrModule: destinationModule });
        // }
      }
    }

    for (const exportName of usedSymbols) {
      const relFilePath = path.relative(packagePath, sf.getFilePath());
      const qq = rootExportsPerRelativeFilePath.get(relFilePath) ?? new Map<string, Info>();
      rootExportsPerRelativeFilePath.set(relFilePath, qq);
      qq.set(exportName, { exportName, isType: false }); // fixme: we should record type
    }
  }

  return {
    allFilesToMove: visitedFiles,
    requiredPackages,
    rootExportsPerRelativeFilePath,
  };
}

// rename this
function addExistingRenamesForRootExport(
  sf: SourceFile,
  packagePath: FilePath,
  packageName: PackageName,
  renames: SymbolRenames,
  destinationModule: string,
  logger: Logger
) {
  const consumed = getConsumedImportsAndExports(
    { logger, packageName, packagePath, project: sf.getProject() },
    sf
  ); // todo memoize?

  // We should use the package.json for this TODO
  const rootFile = getRootFile(sf.getProject());

  if (rootFile == null) {
    logger.error("Couldnt find root file for package: " + packagePath);
    return;
  }

  const rootIndexFileExports = consumed.get(rootFile!.getFilePath())?.reexports;

  if (!rootIndexFileExports) {
    logger.debug("File isn't re-exported! " + sf.getFilePath());
    return;
  }
  for (const [_originalName, { exportName }] of rootIndexFileExports) {
    renames.addRename(packageName, {
      from: [exportName],
      toFileOrModule: destinationModule,
    });
  }

  return rootIndexFileExports;
}

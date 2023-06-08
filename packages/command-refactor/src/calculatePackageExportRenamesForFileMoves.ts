import type { DependencyDirection } from "@eartool/batch";
import type { PackageExportRename } from "@eartool/replacements";
import type { FilePath, PackageName } from "@eartool/utils";
import * as Assert from "node:assert";
import type { Project, SourceFile } from "ts-morph";
import { getConsumedExports as getConsumedImportsAndExports } from "./getConsumedExports.js";
import type { Logger } from "pino";

const packageNameRegex = /^((@[a-zA-Z0-9_-]+\/)?[a-zA-Z0-9_-]+)/;

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
  destinationModule: PackageName,
  direction: DependencyDirection,
  logger: Logger
) {
  const packageExportRenames: PackageExportRename[] = [];
  const requiredPackages = new Set<PackageName>();

  const visitedFiles = new Set<FilePath>();
  const toVisit = [...filesToMove];

  while (toVisit.length > 0) {
    const curFilePath = toVisit.shift()!;
    if (visitedFiles.has(curFilePath)) {
      continue;
    }
    visitedFiles.add(curFilePath);

    const sf = project.getSourceFile(curFilePath);
    if (!sf) continue;
    // in project only;
    addRenamesForRootExport(sf, packagePath, packageExportRenames, destinationModule, logger);

    for (const literal of sf.getImportStringLiterals()) {
      if (literal.getLiteralText().startsWith(".")) continue;
      const depName = packageNameRegex.exec(literal.getLiteralText())?.[0];
      if (!depName) continue;
      requiredPackages.add(depName);
    }

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

  return { allFilesToMove: visitedFiles, packageExportRenames, requiredPackages };
}

function addRenamesForRootExport(
  sf: SourceFile,
  packagePath: FilePath,
  packageExportRenames: PackageExportRename[],
  destinationModule: string,
  logger: Logger
) {
  const consumed = getConsumedImportsAndExports(sf);

  // We should use the package.json for this TODO
  const rootFile = sf
    .getProject()
    .getRootDirectories()
    .flatMap((d) => [d.getSourceFile("index.ts"), d.getSourceFile("index.tsx")])
    .find((a) => a != null);

  if (rootFile == null) {
    logger.error("Couldnt find root file for package: " + packagePath);
    return;
  }

  const rootIndexFileExports = consumed.get(rootFile!.getFilePath())?.reexports;

  if (!rootIndexFileExports) {
    // FIXME use the logger dude
    // console.warn("File isn't re-exported! " + curFilePath);
    return;
  }
  for (const exportName of rootIndexFileExports) {
    packageExportRenames.push({
      from: [exportName],
      toFileOrModule: destinationModule,
    });
  }
}

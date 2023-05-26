import type { ImportSpecifier, SourceFile } from "ts-morph";
import type { PackageExportRename } from "./PackageExportRename.js";
import type { PackageName } from "@eartool/utils";
import type { Replacement } from "./Replacement.js";
import { findEntireQualifiedNameTree } from "@eartool/utils";
import type { Logger } from "pino";
import type { Identifier } from "ts-morph";
import * as Assert from "assert";

export function addSingleFileReplacementsForRenames(
  sf: SourceFile,
  renames: Map<PackageName, PackageExportRename[]>,
  replacements: Replacement[],
  logger: Logger
) {
  const alreadyAdded = new Set();

  for (const importDecl of sf.getImportDeclarations()) {
    try {
      const renamesForPackage = renames.get(importDecl.getModuleSpecifier().getLiteralText());
      if (!renamesForPackage) continue;

      for (const importSpec of importDecl.getNamedImports()) {
        accumulateRenamesForImportedIdentifier(
          importSpec.getAliasNode() ?? importSpec.getNameNode(),
          renamesForPackage,
          replacements,
          alreadyAdded,
          importSpec
        );
      }

      const maybeNamepsaceImport = importDecl.getNamespaceImport();
      if (maybeNamepsaceImport) {
        const modifiedRenames = renamesForPackage.map((a) => ({
          from: [maybeNamepsaceImport.getText(), ...a.from],
          to: [maybeNamepsaceImport.getText(), ...a.to],
        }));

        accumulateRenamesForImportedIdentifier(maybeNamepsaceImport, modifiedRenames, replacements);
      }
    } catch (e) {
      logger.fatal(e);
      logger.flush();
      throw e;
    }
  }
}

function accumulateRenamesForImportedIdentifier(
  importedIdentifier: Identifier,
  packageExportRenames: PackageExportRename[],
  replacements: Replacement[]
): void;
function accumulateRenamesForImportedIdentifier(
  importedIdentifier: Identifier,
  packageExportRenames: PackageExportRename[],
  replacements: Replacement[],
  addedImportSet: Set<unknown>,
  importSpec: ImportSpecifier
): void;
function accumulateRenamesForImportedIdentifier(
  importedIdentifier: Identifier,
  packageExportRenames: PackageExportRename[],
  replacements: Replacement[],
  // in this case we can skip the add
  addedImportSet?: Set<unknown> | undefined,
  importSpec?: ImportSpecifier | undefined
) {
  Assert.ok(
    (addedImportSet == null && importSpec == null) || (addedImportSet != null && importSpec != null)
  );
  for (const refNode of importedIdentifier.findReferencesAsNodes()) {
    if (refNode === importedIdentifier) continue; // I hate this edge case of tsmorph
    if (refNode.getSourceFile() !== importedIdentifier.getSourceFile()) continue;

    for (const packageExportRename of packageExportRenames) {
      const fullyQualifiedInstance = findEntireQualifiedNameTree(refNode, packageExportRename.from);
      if (!fullyQualifiedInstance) continue;

      if (importSpec && addedImportSet && !addedImportSet.has(packageExportRename)) {
        addedImportSet.add(packageExportRename);
        replacements.push({
          start: importSpec.getStart(),
          end: importSpec.getStart(),
          newValue: `${packageExportRename.to[0]},`,
          filePath: refNode.getSourceFile().getFilePath(),
        });
      }

      replacements.push({
        start: fullyQualifiedInstance.getStart(),
        end: fullyQualifiedInstance.getEnd(),
        newValue: packageExportRename.to.join("."),
        filePath: refNode.getSourceFile().getFilePath(),
      });
    }
  }
}

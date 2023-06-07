import type { SourceFile } from "ts-morph";
import type { PackageExportRename } from "./PackageExportRename.js";
import type { PackageName } from "@eartool/utils";
import { accumulateRenamesForImportedIdentifier } from "./accumulateRenamesForImportedIdentifier.js";
import type { Replacements } from "./Replacements.js";

export function addSingleFileReplacementsForRenames(
  sf: SourceFile,
  renames: Map<PackageName, PackageExportRename[]>,
  replacements: Replacements
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
        const modifiedRenames = renamesForPackage.map<PackageExportRename>((a) => ({
          from: [maybeNamepsaceImport.getText(), ...a.from],
          to: [maybeNamepsaceImport.getText(), ...a.to],
        }));

        accumulateRenamesForImportedIdentifier(maybeNamepsaceImport, modifiedRenames, replacements);
      }
    } catch (e) {
      replacements.logger.fatal(e);
      replacements.logger.flush();
      throw e;
    }
  }

  for (const exportDecl of sf.getExportDeclarations()) {
    const renamesForPackage = renames.get(exportDecl.getModuleSpecifier()!.getLiteralText());
    if (!renamesForPackage) continue;

    for (const exportSpec of exportDecl.getNamedExports()) {
      accumulateRenamesForImportedIdentifier(
        exportSpec.getAliasNode() ?? exportSpec.getNameNode(),
        renamesForPackage,
        replacements,
        alreadyAdded,
        exportSpec
      );
    }

    const maybeNamespaceExport = exportDecl.getNamespaceExport();
    if (maybeNamespaceExport) {
      const modifiedRenames = renamesForPackage.map<PackageExportRename>((a) => ({
        from: [maybeNamespaceExport.getText(), ...a.from],
        to: [maybeNamespaceExport.getText(), ...a.to],
      }));

      accumulateRenamesForImportedIdentifier(
        maybeNamespaceExport.getNameNode(),
        modifiedRenames,
        replacements
      );
    }
  }
}

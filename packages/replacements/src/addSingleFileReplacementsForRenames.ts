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
}

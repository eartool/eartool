import type { Identifier, NamespaceExport, SourceFile } from "ts-morph";
import type { PackageExportRename } from "./PackageExportRename.js";
import { getSimplifiedNodeInfoAsString, type PackageName } from "@eartool/utils";
import { accumulateRenamesForImportedIdentifier } from "./accumulateRenamesForImportedIdentifier.js";
import type { Replacements } from "./Replacements.js";

export function addSingleFileReplacementsForRenames(
  sf: SourceFile,
  renames: Map<PackageName, PackageExportRename[]>,
  replacements: Replacements,
  dryRun: boolean
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
          dryRun,
          alreadyAdded,
          importSpec
        );
      }

      const maybeNamepsaceImport = importDecl.getNamespaceImport();
      if (maybeNamepsaceImport) {
        accumulateRenamesForImportedIdentifier(
          maybeNamepsaceImport,
          prependRenames(renamesForPackage, maybeNamepsaceImport),
          replacements,
          dryRun
        );
      }
    } catch (e) {
      replacements.logger.fatal(e);
      replacements.logger.flush();
      throw e;
    }
  }

  for (const exportDecl of sf.getExportDeclarations()) {
    // Handle the index.ts file that just has `export {};`
    const moduleSpecifier = exportDecl.getModuleSpecifier();
    if (!moduleSpecifier) continue;

    const renamesForPackage = renames.get(exportDecl.getModuleSpecifier()!.getLiteralText());
    if (!renamesForPackage) continue;

    for (const exportSpec of exportDecl.getNamedExports()) {
      accumulateRenamesForImportedIdentifier(
        exportSpec.getAliasNode() ?? exportSpec.getNameNode(),
        renamesForPackage,
        replacements,
        dryRun,
        alreadyAdded,
        exportSpec
      );
    }

    const maybeNamespaceExport = exportDecl.getNamespaceExport();
    if (maybeNamespaceExport) {
      accumulateRenamesForImportedIdentifier(
        maybeNamespaceExport.getNameNode(),
        prependRenames(renamesForPackage, maybeNamespaceExport),
        replacements,
        dryRun
      );
    }
  }
}

function prependRenames(
  renamesForPackage: PackageExportRename[],
  maybeNamepsaceImport: Identifier | NamespaceExport
) {
  return renamesForPackage.map<PackageExportRename>(
    (a) =>
      ({
        from: [maybeNamepsaceImport.getText(), ...a.from],
        to: a.to ? [maybeNamepsaceImport.getText(), ...a.to] : undefined,
        toFileOrModule: a.toFileOrModule,
      } as PackageExportRename)
  );
}

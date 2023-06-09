import { addImportOrExport, type Replacements } from "@eartool/replacements";
import type { PackageName } from "@eartool/utils";
import { SyntaxKind, type SourceFile } from "ts-morph";
import { getRootFile } from "./getRootFile.js";

export function cleanupMovedFile(
  sf: SourceFile,
  packageName: PackageName,
  replacements: Replacements,
  dryRun: boolean
) {
  const rootFile = getRootFile(sf.getProject());
  const decls = sf
    .getImportDeclarations()
    .filter((a) => a.getModuleSpecifierValue() == packageName);

  for (const decl of decls) {
    for (const namedImport of decl.getNamedImports()) {
      const rootExportedSymbol = rootFile
        ?.getExportSymbols()
        .find((s) => s.getName() == namedImport.getText());

      for (const rootExportedDecl of rootExportedSymbol?.getDeclarations() ?? []) {
        if (rootExportedDecl.isKind(SyntaxKind.ExportSpecifier)) {
          const newModuleSpecifier = rootExportedDecl
            .getExportDeclaration()
            .getModuleSpecifierValue()!;

          // console.log(newModuleSpecifier);

          addImportOrExport(replacements, namedImport, undefined, newModuleSpecifier, false);
        }
        // console.log(getSimplifiedNodeInfoAsString(rootExportedDecl));
      }

      // console.log(getSimplifiedNodeInfoAsString(q));
      replacements.replaceNode(namedImport.getImportDeclaration(), "");
    }
    if (decl.getDefaultImport()) {
      throw new Error("not implemented");
    }
  }
}

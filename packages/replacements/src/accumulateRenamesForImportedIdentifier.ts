import type { ExportSpecifier, ImportSpecifier } from "ts-morph";
import { SyntaxKind } from "ts-morph";
import type { Replacements } from "./Replacements.js";

export function addImportOrExport(
  replacements: Replacements,
  specifier: ImportSpecifier | ExportSpecifier,
  newSymbolName: string | undefined,
  newModuleSpecifier: string,
  cleanup: boolean
) {
  const keyword = specifier.isKind(SyntaxKind.ExportSpecifier) ? "export" : "import";
  const decl = specifier.getFirstAncestorByKindOrThrow(
    specifier.isKind(SyntaxKind.ExportSpecifier)
      ? SyntaxKind.ExportDeclaration
      : SyntaxKind.ImportDeclaration
  );

  const symbolName = newSymbolName ?? specifier.getName();
  const importLine = `${keyword} { ${symbolName} } from "${newModuleSpecifier}";`;

  replacements.insertAfter(decl, `\n${importLine}`);
  if (cleanup) {
    replacements.deleteNode(specifier.getNameNode());
    replacements.removeNextSiblingIfComma(specifier);
  }
}

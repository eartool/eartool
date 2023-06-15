import type { ExportDeclaration, ImportDeclaration } from "ts-morph";

/**
 * Returns the default import of an import declaration if it exists, otherwise
 * returns undefined, including if gven an ExportDeclaration
 * @param decl
 * @returns
 */

export function getDefaultIdentifier(decl: ImportDeclaration | ExportDeclaration) {
  return "getNamedImports" in decl ? decl.getDefaultImport() : undefined;
}

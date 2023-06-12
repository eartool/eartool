import type { ExportSpecifier, ImportSpecifier } from "ts-morph";

export function getDeclaration(specifier: ImportSpecifier | ExportSpecifier) {
  return "getImportDeclaration" in specifier
    ? specifier.getImportDeclaration()
    : specifier.getExportDeclaration();
}

import type {
  ExportDeclaration,
  ExportSpecifier,
  ImportDeclaration,
  ImportSpecifier,
} from "ts-morph";

export function getNamedSpecifiers(
  decl: ImportDeclaration | ExportDeclaration
): Array<ImportSpecifier | ExportSpecifier> {
  return "getNamedImports" in decl ? decl.getNamedImports() : decl.getNamedExports();
}

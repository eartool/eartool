import type { ExportDeclaration, ImportDeclaration } from "ts-morph";

export function getNamedSpecifiers(decl: ImportDeclaration | ExportDeclaration) {
  return "getNamedImports" in decl ? decl.getNamedImports() : decl.getNamedExports();
}

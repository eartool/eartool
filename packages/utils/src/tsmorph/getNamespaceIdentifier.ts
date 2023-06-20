import type { ExportDeclaration, ImportDeclaration } from "ts-morph";

export function getNamespaceIdentifier(exportDecl: ImportDeclaration | ExportDeclaration) {
  return "getNamespaceImport" in exportDecl
    ? exportDecl.getNamespaceImport()
    : exportDecl.getNamespaceExport()?.getNameNode();
}

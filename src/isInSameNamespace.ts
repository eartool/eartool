import { ModuleDeclaration, Node, SyntaxKind } from "ts-morph";

export function isInSameNamespace(r: Node, namespaceDecl: ModuleDeclaration) {
  return r.getFirstAncestorByKind(SyntaxKind.ModuleDeclaration) == namespaceDecl;
}

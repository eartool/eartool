import { type ModuleDeclaration, Node } from "ts-morph";

export function isNamespaceDeclaration(n: Node): n is ModuleDeclaration {
  return Node.isModuleDeclaration(n) && n.isExported();
}

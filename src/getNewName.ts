import { InterfaceDeclaration, NameableNode } from "ts-morph";
import { Node } from "ts-morph";
import { VariableDeclaration } from "ts-morph";

const constantCase = /^([A-Z_0-9])+$/;

function namespaceNameToUpperSnakeCase(name: string) {
  return name.replace(/[A-Z]/g, (letter, idx) => `${idx == 0 ? "": "_"}${letter}`).toUpperCase()
}

export function getNewName(
  nodeOrName: (NameableNode & Node) | VariableDeclaration | InterfaceDeclaration | string,
  namespaceName: string
): string {
  const name =
    typeof nodeOrName === "string" ? nodeOrName : nodeOrName.getName()!;

  if (constantCase.test(name)) {
    return `${namespaceNameToUpperSnakeCase(namespaceName)}_${name}`
  }

  // Special case a few things
  if (name.endsWith("Props") || name.endsWith("State")) {
    return `${namespaceName}${name}`;
  }

  return `${name}Of${namespaceName}`;
}

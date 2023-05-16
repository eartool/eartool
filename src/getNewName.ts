import {
  InterfaceDeclaration,
  NameableNode,
  Node,
  TypeAliasDeclaration,
  VariableDeclaration,
} from "ts-morph";

const constantCase = /^([A-Z_0-9])+$/;

function namespaceNameToUpperSnakeCase(name: string) {
  return name.replace(/[A-Z]/g, (letter, idx) => `${idx == 0 ? "" : "_"}${letter}`).toUpperCase();
}

export function getNewName(
  nodeOrName:
    | (NameableNode & Node)
    | VariableDeclaration
    | InterfaceDeclaration
    | TypeAliasDeclaration
    | string,
  namespaceName: string
): { localName: string; importName: string } {
  const oldName = typeof nodeOrName === "string" ? nodeOrName : nodeOrName.getName()!;

  if (constantCase.test(oldName)) {
    const newName = `${namespaceNameToUpperSnakeCase(namespaceName)}_${oldName}`;
    return { localName: newName, importName: newName };
  }

  // Special case a few things
  if (oldName.endsWith("Props") || oldName.endsWith("State")) {
    return { localName: `${oldName}`, importName: `${namespaceName}${oldName}` };
  }

  const newName = `${oldName}Of${namespaceName}`;
  return { localName: newName, importName: newName };
}

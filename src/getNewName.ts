import {
  InterfaceDeclaration,
  NameableNode,
  Node,
  TypeAliasDeclaration,
  VariableDeclaration,
} from "ts-morph";
import { splitWords } from "./splitWords.js";

const constantCase = /^([A-Z_0-9])+$/;
const qq = /^([A-Z]?[a-z0-9]+)+$/;

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
    let ret;

    if ((ret = findSuffixMatch(oldName, namespaceName, true))) {
      return ret;
    }

    if (namespaceName.at(-1) === "s") {
      if ((ret = findSuffixMatch(oldName, namespaceName.slice(0, -1), true))) {
        return ret;
      }
    }

    const newName = `${namespaceNameToUpperSnakeCase(namespaceName)}_${oldName}`;
    return { localName: newName, importName: newName };
  }

  // Special case a few things
  if (oldName.endsWith("Props") || oldName.endsWith("State")) {
    return { localName: `${oldName}`, importName: `${namespaceName}${oldName}` };
  }

  let ret;

  if ((ret = findSuffixMatch(oldName, namespaceName, false))) {
    return ret;
  }

  if (namespaceName.at(-1) === "s") {
    if ((ret = findSuffixMatch(oldName, namespaceName.slice(0, -1), false))) {
      return ret;
    }
  }

  const newName = `${oldName}Of${namespaceName}`;
  return { localName: newName, importName: newName };
}

function findSuffixMatch(oldName: string, namespaceName: string, snakeCase: boolean) {
  const splitOldName = snakeCase ? oldName.split("_") : splitWords(oldName);
  const splitNamespace = splitWords(namespaceName).map(
    snakeCase ? (a) => a.toUpperCase() : (a) => a
  );

  for (let i = 0; i > -Math.min(splitNamespace.length, splitOldName.length); i--) {
    if (splitNamespace.at(i - 1) === splitOldName.at(i - 1)) {
      continue;
    }

    if (i === 0) break;

    const newName = [...splitOldName.slice(0, i), ...splitNamespace].join(snakeCase ? "_" : "");
    return { localName: newName, importName: newName };
  }
}

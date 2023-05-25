import type { Identifier } from "ts-morph";
import type { Node } from "ts-morph";
import type { Replacements } from "./Replacements.js";
import { addReplacementsForRenamedIdentifier } from "./addReplacementsForRenamedIdentifier.js";
import { findNewNameInScope } from "../utils/findNewNameInScope.js";

export function autorenameIdentifierAndReferences(
  replacements: Replacements,
  nameNode: Identifier,
  scope: Node,
  banNames: Set<string>
) {
  const newName = findNewNameInScope(nameNode.getText(), scope, banNames);
  replacements.replaceNode(nameNode, newName);
  addReplacementsForRenamedIdentifier(replacements, nameNode, newName);
}

import type { Identifier } from "ts-morph";
import { Node } from "ts-morph";
import type { Replacements } from "./Replacements.js";
import { addReplacementsForRenamedIdentifier } from "./addReplacementsForRenamedIdentifier.js";
import { findNewNameInScope } from "../utils/findNewNameInScope.js";

export function autorenameIdentifierAndReferences(
  replacements: Replacements,
  nameNode: Identifier,
  scope: Node,
  banNames: Set<string>
) {
  const { logger } = replacements;

  logger.trace("TOP OF autorenameIdentifierAndReferences: " + nameNode.getText());
  const newName = findNewNameInScope(nameNode.getText(), scope, banNames);
  const parent = nameNode.getParent();
  if (Node.isBindingElement(parent)) {
    logger.trace(parent.getText());

    if (parent.getPropertyNameNode() == null) {
      logger.trace(
        "!!! " + parent.getNameNode().getText() + " - " + parent.getPropertyNameNode()?.getText()
      );
      replacements.addReplacement(
        nameNode.getSourceFile(),
        nameNode.getEnd(),
        nameNode.getEnd(),
        `: ${newName}`
      );
    } else {
      logger.trace("alt case");
      replacements.replaceNode(nameNode, newName);
    }
  } else {
    logger.trace("parent is not a binding element, its a %s", parent.getKindName());
    replacements.replaceNode(nameNode, newName);
  }
  addReplacementsForRenamedIdentifier(replacements, nameNode, scope, newName);
}

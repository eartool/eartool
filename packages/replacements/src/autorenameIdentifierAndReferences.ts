import { type Identifier } from "ts-morph";
import { Node } from "ts-morph";
import { findNewNameInScope } from "@eartool/utils";
import type { Replacements } from "./Replacements.js";
import { addReplacementsForRenamedIdentifier } from "./addReplacementsForRenamedIdentifier.js";

export function autorenameIdentifierAndReferences(
  replacements: Replacements,
  nameNode: Identifier,
  scope: Node,
  banNames: Set<string>,
) {
  const logger = replacements.logger.child({ primaryNode: nameNode });

  logger.trace("TOP OF autorenameIdentifierAndReferences: " + nameNode.getText());
  const newName = findNewNameInScope(nameNode.getText(), scope, banNames);

  // logger.trace(
  //   "HuH: %s",
  //   scope?.getSymbolsInScope(SymbolFlags.Value).map((a) => a.getName())
  // );

  const parent = nameNode.getParent();
  if (Node.isBindingElement(parent)) {
    logger.trace(parent.getText());

    if (parent.getPropertyNameNode() == null) {
      logger.trace(
        "!!! " + parent.getNameNode().getText() + " - " + parent.getPropertyNameNode()?.getText(),
      );
      replacements.addReplacement(
        nameNode.getSourceFile(),
        nameNode.getEnd(),
        nameNode.getEnd(),
        `: ${newName}`,
      );
    } else {
      logger.trace("alt case");
      replacements.replaceNode(nameNode, " " + newName);
    }
  } else {
    logger.trace("parent is not a binding element, its a %s", parent.getKindName());
    replacements.replaceNode(nameNode, " " + newName);
  }
  addReplacementsForRenamedIdentifier(replacements, nameNode, scope, newName);
}

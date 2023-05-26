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
  // console.log("---" + nameNode.getText());
  const newName = findNewNameInScope(nameNode.getText(), scope, banNames);
  const parent = nameNode.getParent();
  if (Node.isBindingElement(parent)) {
    // console.log(parent.getText());
    // parent.getPropertyNameNode
    if (parent.getPropertyNameNode() == null) {
      // console.log(
      //   "!!! " + parent.getNameNode().getText() + " - " + parent.getPropertyNameNode()?.getText()
      // );
      replacements.addReplacement(
        nameNode.getSourceFile(),
        nameNode.getEnd(),
        nameNode.getEnd(),
        `: ${newName}`
      );
    } else {
      replacements.replaceNode(nameNode, newName);
    }
  } else {
    replacements.replaceNode(nameNode, newName);
  }
  addReplacementsForRenamedIdentifier(replacements, nameNode, scope, newName);
}

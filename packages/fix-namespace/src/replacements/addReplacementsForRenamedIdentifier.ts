import type { Replacements } from "./Replacements.js";
import { Node, type Identifier } from "ts-morph";

/**
 * Renames all the references to the identifier but not the identifier itself!
 */
export function addReplacementsForRenamedIdentifier(
  replacements: Replacements,
  localIdentifier: Identifier,
  scope: Node,
  newName: string
) {
  for (const node of localIdentifier.findReferencesAsNodes()) {
    if (node === localIdentifier) continue;
    if (!node.getFirstAncestor((a) => a === scope)) continue;

    const parent = node.getParent();

    if (Node.isShorthandPropertyAssignment(parent)) {
      replacements.addReplacement(
        node.getSourceFile(),
        node.getEnd(),
        node.getEnd(),
        `: ${newName}`
      );
    } else if (Node.isBindingElement(parent)) {
      if (parent.getPropertyNameNode() == null) {
        replacements.addReplacement(
          node.getSourceFile(),
          node.getEnd(),
          node.getEnd(),
          `: ${newName}`
        );
      }
    } else {
      replacements.replaceNode(node, newName);
    }
  }
}

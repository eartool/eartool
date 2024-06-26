import { type Identifier, Node } from "ts-morph";
import { replaceImportSpecifierWithNewName } from "./replaceImportSpecifierWithNewName.js";
import type { Replacements } from "./Replacements.js";

/**
 * Renames all the references to the identifier but not the identifier itself!
 */
export function addReplacementsForRenamedIdentifier(
  replacements: Replacements,
  localIdentifier: Identifier,
  scope: Node,
  newName: string,
) {
  const logger = replacements.logger.child({ func: addReplacementsForRenamedIdentifier.name });
  for (const node of localIdentifier.findReferencesAsNodes()) {
    if (node === localIdentifier) continue;
    if (!node.getFirstAncestor((a) => a === scope)) continue;

    const parent = node.getParent();
    logger.trace("parent: %s", parent?.getKindName());

    if (Node.isShorthandPropertyAssignment(parent)) {
      replacements.addReplacement(
        node.getSourceFile(),
        node.getEnd(),
        node.getEnd(),
        `: ${newName}`,
      );
    } else if (Node.isBindingElement(parent)) {
      const propertyNameNode = parent.getPropertyNameNode();
      if (propertyNameNode == null) {
        replacements.addReplacement(
          node.getSourceFile(),
          node.getEnd(),
          node.getEnd(),
          `: ${newName}`,
        );
      } else {
        replacements.replaceNode(parent.getNameNode(), " " + newName);
      }
    } else if (Node.isImportSpecifier(parent)) {
      replaceImportSpecifierWithNewName(replacements, parent, " " + newName);
    } else {
      logger.trace("Fallback replacement for %s", node.getText());
      replacements.replaceNode(node, " " + newName);
    }
  }
}

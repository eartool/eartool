import type { NamespaceContext } from "@eartool/replacements";
import { renameReferences } from "./renameReferences.js";

/**
 * Renames all reference to the names provided from the provided namespace.
 *
 * Assumes the namespace is unwrapped AFTER
 *
 * @param typeRenames
 * @param namespaceDecl
 */

export function renameAllReferences(context: NamespaceContext) {
  context.logger.trace("renameAllReferences");

  for (const [oldName, details] of context.renames) {
    if (details.type) {
      renameReferences(oldName, context, true, details.type.exported);
    }
    if (details.concrete) {
      renameReferences(oldName, context, false, details.concrete.exported);
    }
  }
}

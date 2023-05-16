import type { Context } from "./Context.js";
import { renameReferences } from "./renameReferences.js";

/**
 * Renames all reference to the names provided from the provided namespace.
 *
 * Assumes the namespace is unwrapped AFTER
 *
 * @param typeRenames
 * @param namespaceDecl
 */

export function renameAllReferences(context: Context) {
  context.logger.trace("Renaming references");
  for (const oldName of context.typeRenames) {
    renameReferences(oldName, context);
  }

  for (const oldName of context.concreteRenames) {
    renameReferences(oldName, context);
  }
}

import type { Replacements } from "./Replacements.js";
import type { Identifier } from "ts-morph";

/**
 * Renames all the references to the identifier but not the identifier itself!
 */
export function addReplacementsForRenamedIdentifier(
  replacements: Replacements,
  localIdentifier: Identifier,
  newName: string
) {
  for (const q of localIdentifier.findReferencesAsNodes()) {
    if (q === localIdentifier) continue;

    replacements.replaceNode(q, newName);
  }
}

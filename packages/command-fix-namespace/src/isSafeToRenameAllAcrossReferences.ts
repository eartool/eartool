import type { NamespaceContext } from "@eartool/replacements";
import { isSafeToRenameAcrossReferences } from "./isSafeToRenameAcrossReferences.js";

export function isSafeToRenameAllAcrossReferences(context: NamespaceContext) {
  for (const [oldName] of context.renames) {
    isSafeToRenameAcrossReferences(oldName, context);
  }
  return true;
}

import { isSafeToRenameAcrossReferences } from "./isSafeToRenameAcrossReferences.js";
import type { NamespaceContext } from "@eartool/replacements";

export function isSafeToRenameAllAcrossReferences(context: NamespaceContext) {
  for (const oldName of context.typeRenames) {
    isSafeToRenameAcrossReferences(oldName, context);
  }
  for (const oldName of context.concreteRenames) {
    isSafeToRenameAcrossReferences(oldName, context);
  }
  return true;
}

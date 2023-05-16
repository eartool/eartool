import { isSafeToRenameAcrossReferences } from "./isSafeToRenameAcrossReferences.js";
import { type Context } from "./Context.js";

export function isSafeToRenameAllAcrossReferences(context: Context) {
  for (const oldName of context.typeRenames) {
    isSafeToRenameAcrossReferences(oldName, context);
  }
  for (const oldName of context.concreteRenames) {
    isSafeToRenameAcrossReferences(oldName, context);
  }
  return true;
}

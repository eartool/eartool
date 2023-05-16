import { getNewName } from "./getNewName.js";
import { getValidReferenceParentOrThrow } from "./getValidReferenceParentOrThrow.js";
import { isInSameNamespace } from "./isInSameNamespace.js";
import { getReferenceFindableLocalDeclarationOrThrow } from "./utils/getReferenceFindableLocalDeclarationOrThrow.js";
import { type Context } from "./Context.js";

export function isSafeToRenameAcrossReferences(
  oldName: string,
  { namespaceDecl, logger }: Context
) {
  const node = getReferenceFindableLocalDeclarationOrThrow(namespaceDecl, oldName);

  const newName = getNewName(oldName, namespaceDecl.getName());
  for (const refNode of node.findReferencesAsNodes()) {
    if (isInSameNamespace(refNode, namespaceDecl)) continue;
    // This is the identifier for the variable but we need to rename
    // both it AND the access to the namespace so lets get there first
    const parent = getValidReferenceParentOrThrow(refNode, logger);

    // Too lazy to do deep checks here for finding a safe name. yes or no is good enough
    if (parent.getLocal(newName)) {
      // already have something in scope with this name abort
      logger.warn(
        "Not safe to rename `%s.%s` to `%s` because it collides in %s",
        namespaceDecl.getName(),
        oldName,
        newName,
        parent.getSourceFile().getFilePath()
      );
      return false;
    }
  }
}

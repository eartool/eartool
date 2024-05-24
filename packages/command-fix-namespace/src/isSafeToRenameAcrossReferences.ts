import type { NamespaceContext } from "@eartool/replacements";
import { getReferenceFindableLocalDeclarationOrThrow, isInSameNamespace } from "@eartool/utils";
import { getNewName } from "./getNewName.js";
import { getRelevantNodeFromRefOrThrow } from "./getRelevantNodeFromRefOrThrow.js";

export function isSafeToRenameAcrossReferences(
  oldName: string,
  { namespaceDecl, logger }: NamespaceContext,
) {
  const node = getReferenceFindableLocalDeclarationOrThrow(namespaceDecl, oldName);

  const { localName, importName } = getNewName(oldName, namespaceDecl.getName());
  for (const refNode of node.findReferencesAsNodes()) {
    if (isInSameNamespace(refNode, namespaceDecl)) continue;
    const isInSameFile = refNode.getSourceFile() === namespaceDecl.getSourceFile();
    // This is the identifier for the variable but we need to rename
    // both it AND the access to the namespace so lets get there first
    const parent = getRelevantNodeFromRefOrThrow(refNode, oldName, logger);

    // Too lazy to do deep checks here for finding a safe name. yes or no is good enough
    if (parent.getLocal(isInSameFile ? localName : importName)) {
      // already have something in scope with this name abort
      logger.warn(
        "Not safe to rename `%s.%s` to `%s` because it collides in %s",
        namespaceDecl.getName(),
        oldName,
        importName,
        parent.getSourceFile().getFilePath(),
      );
      throw new Error();
      return false;
    }
  }
}

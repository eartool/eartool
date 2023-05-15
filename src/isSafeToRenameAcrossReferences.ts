import * as Assert from "node:assert";
import { ModuleDeclaration, Node } from "ts-morph";
import { getNewName } from "./getNewName.js";
import { getValidReferenceParentOrThrow } from "./getValidReferenceParentOrThrow.js";

export function isSafeToRenameAcrossReferences(
  toRename: Set<string>,
  namespaceDecl: ModuleDeclaration
) {
  for (const name of toRename) {
    const originalSymbol = namespaceDecl.getLocalOrThrow(name);
    // should ony be one
    // FIXME I think this fails if there is a type by the same name?
    const [q] = originalSymbol.getDeclarations();
    Assert.ok(
      Node.isReferenceFindable(q),
      "Invariant failed. How is this not findable?"
    );

    const newName = getNewName(name, namespaceDecl.getName());
    for (const r of q.findReferencesAsNodes()) {
      // This is the identifier for the variable but we need to rename
      // both it AND the access to the namespace so lets get there first
      console.log({
        parent: r.getParent()!.getKindName(),
        self: r.getKindName(),
      });
      const parent = getValidReferenceParentOrThrow(r);

      // Too lazy to do deep checks here for finding a safe name. yes or no is good enough
      if (parent.getLocal(newName)) {
        // already have something in scope with this name abort
        // TODO LOG
        return false;
      }
    }
  }
  return true;
}



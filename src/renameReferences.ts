import { SyntaxKind, ModuleDeclaration } from "ts-morph";
import { Node } from "ts-morph";
import * as Assert from "node:assert";
import { getNewName } from "./getNewName.js";
import { getValidReferenceParentOrThrow } from "./getValidReferenceParentOrThrow.js";

/**
 * Renames all reference to the names provided from the provided namespace.
 *
 * Assumes the namespace is unwrapped AFTER
 *
 * @param toRename
 * @param namespaceDecl
 */
export function renameReferences(
  toRename: Set<string>,
  namespaceDecl: ModuleDeclaration
) {
  for (const oldName of toRename) {
    const newName = getNewName(oldName, namespaceDecl.getName());
    const sym = namespaceDecl.getLocalOrThrow(oldName);
    // should ony be one
    const [q] = sym.getDeclarations();
    Assert.ok(
      Node.isReferenceFindable(q),
      "Invariant failed. How is this not findable?"
    );

    for (const r of q.findReferencesAsNodes()) {
      // This is the identifier for the variable but we need to rename
      // both it AND the access to the namespace so lets get there first
      const parent = getValidReferenceParentOrThrow(r);

      // We need to save this off because `r` is invalid after we replace
      const referencingSf = r.getSourceFile();

      // Too lazy to do deep checks here.
      parent.replaceWithText(newName);

      if (referencingSf != namespaceDecl.getSourceFile()) {
        referencingSf.addImportDeclaration({
          moduleSpecifier: referencingSf.getRelativePathAsModuleSpecifierTo(
            namespaceDecl.getSourceFile()
          ),
          namedImports: [newName],
        });
      }
    }

    // console.log("Length: " + sym.getDeclarations().length);
  }
}

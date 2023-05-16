import * as Assert from "node:assert";
import { InterfaceDeclaration, ModuleDeclaration, Node, SyntaxKind } from "ts-morph";
import { getNewName } from "./getNewName.js";
import { getValidReferenceParentOrThrow } from "./getValidReferenceParentOrThrow.js";
import { Logger } from "pino";
import { isInSameNamespace } from "./isInSameNamespace.js";

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
  namespaceDecl: ModuleDeclaration,
  originalLogger: Logger
) {
  originalLogger.trace("Renaming references");
  for (const oldName of toRename) {
    const logger = originalLogger.child({ oldName });
    const newName = getNewName(oldName, namespaceDecl.getName());
    const sym = namespaceDecl.getLocalOrThrow(oldName);
    // should ony be one
    const [q] = sym.getDeclarations();
    Assert.ok(Node.isReferenceFindable(q), "Invariant failed. How is this not findable?");

    for (const r of q.findReferencesAsNodes()) {
      logger.trace("Found %s", r.print());
      // We need to save this off because `r` is invalid after we replace
      const referencingSf = r.getSourceFile();
      const isInSameFile = referencingSf == namespaceDecl.getSourceFile();

      // If we are in the same module block, we want to rename differently
      if (isInSameNamespace(r, namespaceDecl)) continue;

      // This is the identifier for the variable but we need to rename
      // both it AND the access to the namespace so lets get there first
      const parent = getValidReferenceParentOrThrow(r, logger);
      logger.trace("Found parent %s", parent.print());

      // Too lazy to do deep checks here.
      parent.replaceWithText(newName);

      if (!isInSameFile) {
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

  // re exports wont be able to reference the inner bit, just the namespace so we can fix that now
  for (const r of namespaceDecl.findReferencesAsNodes()) {
    const exportDecl = r.getFirstAncestorByKind(SyntaxKind.ExportDeclaration);

    if (exportDecl) {
      originalLogger.trace("Found %s in %s", exportDecl.print(), exportDecl);

      exportDecl.addNamedExports(Array.from(toRename));
      exportDecl
        .getNamedExports()
        .find((a) => a.getName() === namespaceDecl.getName())
        ?.remove();
    }
  }
}

import * as Assert from "node:assert";
import { Node } from "ts-morph";
import { getNewName } from "./getNewName.js";
import { getValidReferenceParentOrThrow } from "./getValidReferenceParentOrThrow.js";
import { isInSameNamespace } from "./isInSameNamespace.js";
import type { Context } from "./Context.js";

export function renameReferences(oldName: string, context: Context) {
  const { namespaceDecl } = context;
  const logger = context.logger.child({ oldName });
  const { localName, importName } = getNewName(oldName, namespaceDecl.getName());
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
    if (isInSameFile) {
      parent.replaceWithText(localName);
    } else {
      parent.replaceWithText(importName);

      referencingSf.addImportDeclaration({
        moduleSpecifier: referencingSf.getRelativePathAsModuleSpecifierTo(
          namespaceDecl.getSourceFile()
        ),
        namedImports: [
          {
            name: localName,
            alias: importName,
          },
        ],
      });
    }
  }
}

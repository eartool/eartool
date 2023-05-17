import * as Assert from "node:assert";
import { Node, SyntaxKind } from "ts-morph";
import { getNewName } from "./getNewName.js";
import { getRelevantNodeFromRefOrThrow } from "./getRelevantNodeFromRefOrThrow.js";
import type { NamespaceContext } from "./Context.js";

export function renameReferences(oldName: string, context: NamespaceContext) {
  const { namespaceDecl } = context;
  const logger = context.logger.child({ oldName });
  const { localName, importName } = getNewName(oldName, namespaceDecl.getName());
  const sym = namespaceDecl.getLocalOrThrow(oldName);
  // should ony be one
  const [q] = sym.getDeclarations();
  Assert.ok(Node.isReferenceFindable(q), "Invariant failed. How is this not findable?");

  logger.info("Inside renameReferences for '%s' (%s)", q.getText(), q.getKindName());
  context.addReplacementForNode(q, localName);

  logger.trace("Count of references: %d", q.findReferencesAsNodes().length);

  for (const r of q.findReferencesAsNodes()) {
    logger.trace("Found ref: %s %s", r.print(), r.getKindName());

    // Annoyingly, if you are referenced, this triggers on yourself
    // but if you are not referenced it doesn't. So thats cool... eg:
    // export namespace Foo {
    //   export function bar() {
    //     baz();
    //   }
    //   export function baz() {
    //     return 5;
    //   }
    // }
    if (r == q.getFirstDescendantByKindOrThrow(SyntaxKind.Identifier)) {
      continue; // sigh. just us again
    }

    // We need to save this off because `r` is invalid after we replace
    const referencingSf = r.getSourceFile();
    const isInSameFile = referencingSf == namespaceDecl.getSourceFile();

    // This is the identifier for the variable but we need to rename
    // both it AND the access to the namespace so lets get there first
    const nodeToRename = getRelevantNodeFromRefOrThrow(r, logger);
    logger.trace("Found parent: %s", nodeToRename.print());

    logger.trace("r: {%s, %d, %d}", r.getText(), r.getStart(), r.getEnd());
    logger.trace(
      "p: {%s, %d, %d}",
      nodeToRename.getText(),
      nodeToRename.getStart(),
      nodeToRename.getEnd()
    );

    if (isInSameFile) {
      context.addReplacement({
        start: nodeToRename.getStart(),
        end: nodeToRename.getEnd(),
        newValue: localName,
        filePath: referencingSf.getFilePath(),
      });
    } else {
      context.addReplacement({
        start: nodeToRename.getStart(),
        end: nodeToRename.getEnd(),
        newValue: importName,
        filePath: referencingSf.getFilePath(),
      });

      context.addReplacement({
        start: 0,
        end: 0,
        filePath: referencingSf.getFilePath(),
        newValue: `import { ${localName} as ${importName}} from "${referencingSf.getRelativePathAsModuleSpecifierTo(
          namespaceDecl.getSourceFile()
        )}";`,
      });
    }
  }
}

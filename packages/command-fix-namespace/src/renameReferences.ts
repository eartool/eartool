import * as Assert from "node:assert";
import type { SourceFile } from "ts-morph";
import { Node, SyntaxKind } from "ts-morph";
import type { NamespaceContext } from "@eartool/replacements";
import { getProperRelativePathAsModuleSpecifierTo } from "@eartool/utils";
import { isAnyOf } from "@reduxjs/toolkit";
import { getNewName } from "./getNewName.js";
import { getRelevantNodeFromRefOrThrow } from "./getRelevantNodeFromRefOrThrow.js";

const isTypeNode = isAnyOf(Node.isInterfaceDeclaration, Node.isTypeAliasDeclaration);

export function renameReferences(oldName: string, context: NamespaceContext, isType: boolean) {
  const { namespaceDecl } = context;
  const logger = context.logger.child({ oldName });
  const { localName, importName } = getNewName(oldName, namespaceDecl.getName());
  const sym = namespaceDecl.getLocalOrThrow(oldName);
  const q = sym.getDeclarations().find((a) => isTypeNode(a) === isType);
  Assert.ok(q != null, `There should definitely be node here for us to rename. ${oldName}`);
  Assert.ok(Node.isReferenceFindable(q), "Invariant failed. How is this not findable?");

  logger.trace("Inside renameReferences for '%s' (%s)", q.getText(), q.getKindName());
  context.addReplacementForNode(q, localName);

  logger.trace("Count of references: %d", q.findReferencesAsNodes().length);

  const addedToImports = new Map<SourceFile, boolean>();

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
    logger.trace("Found node to replace: %s", nodeToRename.print());

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

      if (!addedToImports.has(referencingSf)) {
        addedToImports.set(referencingSf, true);

        const moduleSpecifier = getProperRelativePathAsModuleSpecifierTo(
          referencingSf,
          namespaceDecl.getSourceFile()
        );
        const newImportSpecifierText =
          localName === importName ? localName : `${localName} as ${importName}`;

        const namedBindings = referencingSf
          .getImportDeclarations()
          .find((a) => a.getModuleSpecifierValue() == moduleSpecifier)
          ?.getImportClause()
          ?.getNamedBindings();

        if (!namedBindings || !namedBindings.isKind(SyntaxKind.NamedImports)) {
          // shouldn't happen in the namespace case but i'm being careful
          context.addReplacement({
            start: 0,
            end: 0,
            filePath: referencingSf.getFilePath(),
            newValue: `import { ${newImportSpecifierText}} from "${moduleSpecifier}";`,
          });
        } else {
          const brace = namedBindings.getFirstChildByKindOrThrow(SyntaxKind.OpenBraceToken);

          context.addReplacement({
            start: brace.getEnd(),
            end: brace.getEnd(),
            filePath: referencingSf.getFilePath(),
            newValue: newImportSpecifierText + ",",
          });
        }
      }
    }
  }
}

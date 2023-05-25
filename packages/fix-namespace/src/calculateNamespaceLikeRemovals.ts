import { Node, SyntaxKind, type SourceFile, Statement } from "ts-morph";
import * as Assert from "assert";
import type { Replacements } from "./replacements/Replacements.js";
import {
  isNamespaceLike,
  type NamespaceLike,
  type NamespaceLikeVariableDeclaration,
} from "./utils/tsmorph/isNamespaceLike.js";
import { isAnyOf } from "@reduxjs/toolkit";

export function calculateNamespaceLikeRemovals(sf: SourceFile, replacements: Replacements) {
  // TODO: Only perform task if its the only export
  // TODO: Should we check the filename too?

  // TODO: Check for collisions?

  for (const statement of sf.getStatements()) {
    if (!isNamespaceLike(statement)) continue;
    const varDecl = statement.getDeclarations()[0];

    replaceImportsAndExports(varDecl, replacements);
    unwrapInFile(varDecl, replacements, statement);
  }
}

function unwrapInFile(
  varDecl: NamespaceLikeVariableDeclaration,
  replacements: Replacements,
  namespaceLike: NamespaceLike
) {
  const sf = namespaceLike.getSourceFile();
  const syntaxList = varDecl.getInitializer().getExpression().getChildSyntaxList()!;

  // Drop `export const Name = {`
  replacements.remove(sf, namespaceLike.getStart(), syntaxList.getFullStart());

  // drop `} as const;`
  const closeBrace = syntaxList.getNextSiblingIfKindOrThrow(SyntaxKind.CloseBraceToken);
  replacements.remove(sf, closeBrace.getStart(), namespaceLike.getEnd());

  for (const q of varDecl.getInitializer().getExpression().getProperties()) {
    if (Node.isMethodDeclaration(q)) {
      replacements.insertBefore(q, "export function ");
    } else {
      replacements.addReplacement(
        sf,
        q.getStart(),
        q.getFirstChildByKindOrThrow(SyntaxKind.ColonToken).getEnd(),
        `export const ${q.getName()} = `
      );
    }
    replacements.removeNextSiblingIfComma(q);
  }
}

function replaceImportsAndExports(
  varDecl: NamespaceLikeVariableDeclaration,
  replacements: Replacements
) {
  const visitedSpecifiers = new Set();
  for (const refIdentifier of varDecl.findReferencesAsNodes()) {
    // alias import nodes show up twice for some reason
    // so we need to account for that
    const specifier = refIdentifier.getParentIf(
      isAnyOf(Node.isExportSpecifier, Node.isImportSpecifier)
    );
    if (!specifier) continue;
    if (visitedSpecifiers.has(specifier)) continue;

    const named = specifier.getParentIfOrThrow(isAnyOf(Node.isNamedExports, Node.isNamedImports));
    Assert.ok(named.getElements().length == 1);
    const varName = (specifier.getAliasNode() ?? specifier.getNameNode()).getText();
    replacements.replaceNode(named, `* as ${varName}`);
    visitedSpecifiers.add(specifier);
  }
}

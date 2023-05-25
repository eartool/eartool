import { Node, SyntaxKind, type SourceFile } from "ts-morph";
import * as Assert from "assert";
import type { Replacements } from "./replacements/Replacements.js";
import {
  isNamespaceLike,
  type NamespaceLike,
  type NamespaceLikeVariableDeclaration,
} from "./utils/tsmorph/isNamespaceLike.js";
import { isAnyOf } from "@reduxjs/toolkit";
import { replaceAllNamesInScope } from "./replacements/replaceAllNamesInScope.js";

export function calculateNamespaceLikeRemovals(sf: SourceFile, replacements: Replacements) {
  // TODO: Only perform task if its the only export
  // TODO: Should we check the filename too?

  // TODO: Check for collisions?

  const exports = sf.getStatements().filter((s) => {
    if (Node.isExportable(s)) {
      return s.isExported();
    }
    return false;
  });

  if (exports.length > 1) {
    // console.log(sf.getFilePath());
    // console.log(
    //   exports.map((e) => {
    //     if (Node.isModuleDeclaration(e)) {
    //       return e.getName();
    //     } else if (Node.isVariableStatement(e)) {
    //       return e.getDeclarations().map((a) => a.getName());
    //     } else if (Node.isFunctionDeclaration(e)) {
    //       return e.getName();
    //     }
    //   })
    // );
    return;
  }

  for (const statement of sf.getStatements()) {
    if (!isNamespaceLike(statement)) continue;

    // not bothering with this case right now
    if (statement.getDeclarations().length > 1) continue;

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

  // Its possible there was self referential code, so we need to handle that case
  for (const refIdentifier of varDecl.findReferencesAsNodes()) {
    if (refIdentifier.getSourceFile() !== sf) continue;

    const parent = refIdentifier.getParentIfKind(SyntaxKind.PropertyAccessExpression);
    if (!parent) continue;

    replacements.replaceNode(parent, parent.getNameNode().getFullText());
  }

  // And of course we can import things that now collide
  const propertyNames = new Set(
    varDecl
      .getInitializer()
      .getExpression()
      .getProperties()
      .map((a) => a.getName())
  );

  replaceAllNamesInScope(replacements, varDecl.getSourceFile(), propertyNames);
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
    if (named.getElements().length != 1) continue;
    Assert.ok(
      named.getElements().length == 1,
      `Expected only one element in '${named.getText()}', file: ${named
        .getSourceFile()
        .getFilePath()} while looking for ${specifier.getText()}`
    );
    const varName = (specifier.getAliasNode() ?? specifier.getNameNode()).getText();
    replacements.replaceNode(named, `* as ${varName}`);
    visitedSpecifiers.add(specifier);
  }
}

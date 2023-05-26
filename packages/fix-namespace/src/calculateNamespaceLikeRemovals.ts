import { Node, SyntaxKind, type SourceFile, SymbolFlags } from "ts-morph";
import * as Assert from "assert";
import type { Replacements } from "@eartool/replacements";
import {
  isNamespaceLike,
  type NamespaceLike,
  type NamespaceLikeVariableDeclaration,
} from "@eartool/utils";
import { isAnyOf } from "@reduxjs/toolkit";
import { replaceAllNamesInScope } from "@eartool/replacements";
import { autorenameIdentifierAndReferences } from "@eartool/replacements";

export function calculateNamespaceLikeRemovals(sf: SourceFile, replacements: Replacements) {
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

  const propertyNames = new Set(
    varDecl
      .getInitializer()
      .getExpression()
      .getProperties()
      .map((a) => a.getName())
  );

  // Drop `export const Name = {`
  replacements.remove(sf, namespaceLike.getStart(), syntaxList.getFullStart());

  // drop `} as const;`
  const closeBrace = syntaxList.getNextSiblingIfKindOrThrow(SyntaxKind.CloseBraceToken);
  replacements.remove(sf, closeBrace.getStart(), namespaceLike.getEnd());

  for (const propOrMethod of varDecl.getInitializer().getExpression().getProperties()) {
    if (Node.isMethodDeclaration(propOrMethod)) {
      replacements.insertBefore(propOrMethod, "export function ");

      // console.log("METHOD: " + propOrMethod.getName());
      // console.log(
      //   propOrMethod
      //     .getBodyOrThrow()
      //     .getSymbolsInScope(SymbolFlags.Value)
      //     .map((a) => a.getName())
      // );

      const set = new Set(propOrMethod.getBodyOrThrow().getSymbolsInScope(SymbolFlags.Value));

      for (const q of propOrMethod.getParent().getSymbolsInScope(SymbolFlags.Value)) {
        set.delete(q);
      }

      // console.log([...set].map((a) => a.getName()));
      for (const q of set) {
        if (!propertyNames.has(q.getName())) continue;
        // console.log(q.getName());
        const d = q.getDeclarations()[0];
        if (!d) continue;
        if (
          Node.isFunctionDeclaration(d) ||
          Node.isVariableDeclaration(d) ||
          Node.isBindingElement(d) ||
          Node.isBindingNamed(d)
        ) {
          // need to rename this
          const nameNode = d.getNameNode()!.asKindOrThrow(SyntaxKind.Identifier);
          // console.log(d.getKindName() + " _ " + d.getText());
          autorenameIdentifierAndReferences(replacements, nameNode, propOrMethod, propertyNames);
        }

        // console.log(d.getKindName() + " _ " + d.getText());
      }

      // propOrMethod.forEachDescendant((node, traversal) => {
      //   if (Node.isIdentifier(node)) {
      //     if (propertyNames.has(node.getText()))
      //       console.log(`${node.getText()} : ${node.getParent().getKindName()}`);
      //   }
      // });

      // console.log(body.getKindName());
      // console.log(
      //   body
      //     .getChildSyntaxList()
      //     ?.getChildAtIndex(0)
      //     // ?.getSymbolsInScope(SymbolFlags.Variable)
      //     ?.getLocals()
      //     .map((a) => a.getName())
      // );

      //const body = propOrMethod.getBodyOrThrow();
      // replaceAllNamesInScope(replacements, body, propertyNames);
    } else {
      replacements.addReplacement(
        sf,
        propOrMethod.getStart(),
        propOrMethod.getFirstChildByKindOrThrow(SyntaxKind.ColonToken).getEnd(),
        `export const ${propOrMethod.getName()} = `
      );
    }
    replacements.removeNextSiblingIfComma(propOrMethod);
  }

  // Its possible there was self referential code, so we need to handle that case
  for (const refIdentifier of varDecl.findReferencesAsNodes()) {
    if (refIdentifier.getSourceFile() !== sf) continue;

    const parent = refIdentifier.getParentIfKind(SyntaxKind.PropertyAccessExpression);
    if (!parent) continue;

    replacements.replaceNode(parent, parent.getNameNode().getFullText());
  }

  // And of course we can import things that now collide

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

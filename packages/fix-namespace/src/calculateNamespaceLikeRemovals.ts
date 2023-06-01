import {
  type MethodDeclaration,
  type FunctionDeclaration,
  type ModuleDeclaration,
  type SyntaxList,
  VariableStatement,
} from "ts-morph";
import { Node, SyntaxKind, type SourceFile, SymbolFlags } from "ts-morph";
import type { Replacements } from "@eartool/replacements";
import {
  isNamespaceLike,
  type NamespaceLike,
  type NamespaceLikeVariableDeclaration,
} from "@eartool/utils";
import { replaceAllNamesInScope } from "@eartool/replacements";
import { autorenameIdentifierAndReferences } from "@eartool/replacements";
import { replaceImportsAndExports } from "./replaceImportsAndExports.js";
import type { Logger } from "pino";
import type { Module } from "@reduxjs/toolkit/query";

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
    unwrapInFile(varDecl, replacements);
  }
}

export function unwrapInFile(
  varDecl: NamespaceLikeVariableDeclaration | ModuleDeclaration,
  replacements: Replacements
) {
  const logger = replacements.logger.child({ primaryNode: varDecl });

  const sf = varDecl.getSourceFile();
  const syntaxList = Node.isModuleDeclaration(varDecl)
    ? varDecl.getChildSyntaxListOrThrow()
    : varDecl.getInitializer().getExpression().getChildSyntaxList()!;

  const exportedNames = new Set(
    syntaxList
      .getChildren()
      .flatMap((a) => (Node.isVariableStatement(a) ? a.getDeclarations() : a))
      .filter(Node.hasName)
      .map((a) => a.getName())
  );

  logger.trace("Exported names: %s", [...exportedNames].join(", "));

  const startNode = Node.isModuleDeclaration(varDecl)
    ? varDecl
    : varDecl.getFirstAncestorByKindOrThrow(SyntaxKind.VariableStatement);

  // Drop `export const Name = {`
  // Drop `export namespace Foo {`
  replacements.remove(sf, startNode.getStart(), syntaxList.getFullStart());

  // drop `} as const;`
  // drop `};`
  const closeBrace = syntaxList.getNextSiblingIfKindOrThrow(SyntaxKind.CloseBraceToken);
  replacements.remove(sf, closeBrace.getStart(), varDecl.getEnd());

  const kids = Node.isModuleDeclaration(varDecl)
    ? varDecl.getChildSyntaxListOrThrow().getChildren()
    : varDecl.getInitializer().getExpression().getProperties();
  for (const propOrMethod of kids) {
    if (Node.isMethodDeclaration(propOrMethod)) {
      // namespace like
      replacements.insertBefore(propOrMethod, "export function ");
      renameVariablesInBody(exportedNames, replacements, propOrMethod);
    } else if (Node.isPropertyAssignment(propOrMethod)) {
      // namespace like
      replacements.addReplacement(
        sf,
        propOrMethod.getStart(),
        propOrMethod.getFirstChildByKindOrThrow(SyntaxKind.ColonToken).getEnd(),
        `export const ${(propOrMethod as any).getName()} = `
      );
    } else if (Node.isFunctionDeclaration(propOrMethod)) {
      // namespace
      renameVariablesInBody(exportedNames, replacements, propOrMethod);
    } else if (Node.isVariableStatement(propOrMethod)) {
      // namespace
      // do nothing!
    } else {
      replacements.logger.error("Unexpected kind %s", propOrMethod.getKindName());
    }
    replacements.removeNextSiblingIfComma(propOrMethod);
  }

  // Its possible there was self referential code, so we need to handle that case
  replaceSelfReferentialUsage(varDecl, replacements);

  // And of course we can import things that now collide

  replaceAllNamesInScope(replacements, varDecl.getSourceFile(), exportedNames);
}

export function replaceSelfReferentialUsage(
  varDecl: NamespaceLikeVariableDeclaration | ModuleDeclaration,
  replacements: Replacements
) {
  for (const refIdentifier of varDecl.findReferencesAsNodes()) {
    if (refIdentifier.getSourceFile() !== varDecl.getSourceFile()) continue;

    const parent = refIdentifier.getParentIfKind(SyntaxKind.PropertyAccessExpression);
    if (!parent) continue;

    replacements.replaceNode(parent, parent.getNameNode().getFullText());
  }
}

export function renameVariablesInBody(
  banNames: Set<string>,
  replacements: Replacements,
  propOrMethod: MethodDeclaration | FunctionDeclaration | SyntaxList
) {
  const logger = replacements.logger.child({
    method: renameVariablesInBody.name,
    banNames: [...banNames].join(", "),
    primaryNode: propOrMethod,
  });
  const symbolsInScope = getSymbolsExclusiveToFunctionBody(propOrMethod, replacements.logger);

  logger.trace(
    "propOrMethod name: %s",
    Node.hasName(propOrMethod) ? propOrMethod.getName() : propOrMethod.getKindName()
  );
  logger.trace("Symbols in scope: %s", [...symbolsInScope].map((a) => a.getName()).join(", "));

  for (const q of symbolsInScope) {
    if (!banNames.has(q.getName())) continue;
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
      autorenameIdentifierAndReferences(replacements, nameNode, propOrMethod, banNames);
    }

    // console.log(d.getKindName() + " _ " + d.getText());
  }
}

// This is wrong, it should be the symbols in scope that are not in the parent scope
export function getSymbolsExclusiveToFunctionBody(
  node: MethodDeclaration | FunctionDeclaration | SyntaxList,
  passedLogger: Logger
) {
  const logger = passedLogger.child({ primaryNode: node });

  const body = Node.isSyntaxList(node) ? node : node.getBodyOrThrow();
  const set = new Set(body.getSymbolsInScope(SymbolFlags.Value));

  // logger.info([...set].map((a) => a.getName()));

  for (const q of set) {
    if (
      q.getDeclarations().length == 0 ||
      !q
        .getDeclarations()
        .every((d) => d.getSourceFile() === node.getSourceFile() && d.getAncestors().includes(node))
    ) {
      set.delete(q);
    }
  }

  logger.info(
    "Discovered exclusive in body scope: %s",
    [...set].map((a) => a.getName()).join(", ")
  );

  return set;
}

import type {
  FunctionDeclaration,
  MethodDeclaration,
  SyntaxList,
  ModuleDeclaration,
} from "ts-morph";
import { Node, SyntaxKind, SymbolFlags } from "ts-morph";
import { autorenameIdentifierAndReferences, type Replacements } from "@eartool/replacements";
import {
  getSimplifiedNodeInfoAsString,
  type NamespaceLikeVariableDeclaration,
} from "@eartool/utils";
import { replaceAllNamesInScope } from "@eartool/replacements";
import type { Logger } from "pino";

export function unwrapNamespaceInFile(
  varOrModuleDecl: NamespaceLikeVariableDeclaration | ModuleDeclaration,
  replacements: Replacements
) {
  const logger = replacements.logger.child({ primaryNode: varOrModuleDecl });

  const sf = varOrModuleDecl.getSourceFile();
  const syntaxList = Node.isModuleDeclaration(varOrModuleDecl)
    ? varOrModuleDecl.getChildSyntaxListOrThrow()
    : varOrModuleDecl.getInitializer().getExpression().getChildSyntaxList()!;

  const exportedNames = new Set(
    syntaxList
      .getChildren()
      .flatMap((a) => (Node.isVariableStatement(a) ? a.getDeclarations() : a))
      .filter(Node.hasName)
      .map((a) => a.getName())
  );

  logger.trace("Exported names: %s", [...exportedNames].join(", "));

  const startNode = Node.isModuleDeclaration(varOrModuleDecl)
    ? varOrModuleDecl
    : varOrModuleDecl.getFirstAncestorByKindOrThrow(SyntaxKind.VariableStatement);

  // Drop `export const Name = {`
  // Drop `export namespace Foo {`
  replacements.remove(sf, startNode.getStart(), syntaxList.getFullStart());

  // drop `} as const;`
  // drop `};`
  const closeBrace = syntaxList.getNextSiblingIfKindOrThrow(SyntaxKind.CloseBraceToken);
  replacements.remove(sf, closeBrace.getStart(), varOrModuleDecl.getEnd());

  const kids = Node.isModuleDeclaration(varOrModuleDecl)
    ? varOrModuleDecl.getChildSyntaxListOrThrow().getChildren()
    : varOrModuleDecl.getInitializer().getExpression().getProperties();
  for (const childNode of kids) {
    if (Node.isMethodDeclaration(childNode)) {
      // namespace like
      replacements.insertBefore(childNode, "export function ");
      renameVariablesInBody(exportedNames, replacements, childNode);
    } else if (Node.isPropertyAssignment(childNode)) {
      // namespace like
      replacements.addReplacement(
        sf,
        childNode.getStart(),
        childNode.getFirstChildByKindOrThrow(SyntaxKind.ColonToken).getEnd(),
        `export const ${(childNode as any).getName()} = `
      );
    } else if (Node.isFunctionDeclaration(childNode)) {
      // namespace
      renameVariablesInBody(exportedNames, replacements, childNode);
    } else if (Node.isVariableStatement(childNode)) {
      // namespace
      // do nothing!
    } else if (Node.isInterfaceDeclaration(childNode) || Node.isTypeAliasDeclaration(childNode)) {
      // Do nothign here either. We continue to export if it was exported otherwise we leave it as is.
    } else if (childNode.isKind(SyntaxKind.SingleLineCommentTrivia)) {
      // We can just let the comments fall through
    } else {
      replacements.logger.error(
        "unwrapNamespaceInFile(): Unexpected kind %s",
        getSimplifiedNodeInfoAsString(childNode)
      );
    }
    replacements.removeNextSiblingIfComma(childNode);
  }

  // Its possible there was self referential code, so we need to handle that case
  replaceSelfReferentialUsage(varOrModuleDecl, replacements);

  // And of course we can import things that now collide
  replaceAllNamesInScope(replacements, varOrModuleDecl.getSourceFile(), exportedNames);
}

export function replaceSelfReferentialUsage(
  varDecl: NamespaceLikeVariableDeclaration | ModuleDeclaration,
  replacements: Replacements
) {
  for (const refIdentifier of varDecl.findReferencesAsNodes()) {
    if (refIdentifier.getSourceFile() !== varDecl.getSourceFile()) continue;

    const parentOfRef = refIdentifier.getParentOrThrow();

    if (parentOfRef.isKind(SyntaxKind.PropertyAccessExpression)) {
      replacements.replaceNode(parentOfRef, parentOfRef.getNameNode().getFullText());
    } else if (parentOfRef.isKind(SyntaxKind.QualifiedName)) {
      replacements.replaceNode(parentOfRef, parentOfRef.getRight().getText());
    }
  }
}

export function renameVariablesInBody(
  banNames: Set<string>,
  replacements: Replacements,
  propOrMethod: MethodDeclaration | FunctionDeclaration | SyntaxList
) {
  const logger = replacements.logger.child({
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

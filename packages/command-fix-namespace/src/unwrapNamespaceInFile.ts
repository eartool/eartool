import { autorenameIdentifierAndReferences, type Replacements } from "@eartool/replacements";
import { replaceAllNamesInScope } from "@eartool/replacements";
import { getSimplifiedNodeInfoAsString } from "@eartool/utils";
import type { Logger } from "pino";
import type {
  FunctionDeclaration,
  MethodDeclaration,
  ModuleDeclaration,
  Symbol,
  SyntaxList,
  VariableDeclaration,
} from "ts-morph";
import { Node, SymbolFlags, SyntaxKind } from "ts-morph";
import { getNamespaceLike } from "../../utils/src/tsmorph/isNamespaceLike.js";

export function unwrapNamespaceInFile(
  varOrModuleDecl: VariableDeclaration | ModuleDeclaration,
  replacements: Replacements,
) {
  const logger = replacements.logger.child({ primaryNode: varOrModuleDecl });

  const namespaceLike = getNamespaceLike(varOrModuleDecl);
  if (!namespaceLike) throw "Bye";

  const sf = varOrModuleDecl.getSourceFile();
  const syntaxList = namespaceLike.syntaxList;

  const exportedNames = new Set(
    syntaxList
      .getChildren()
      .flatMap((a) => (Node.isVariableStatement(a) ? a.getDeclarations() : a))
      .filter(Node.hasName)
      .map((a) => a.getName()),
  );

  logger.trace("Exported names: %s", [...exportedNames].join(", "));

  const startNode = namespaceLike.startNode;

  // Drop `export const Name = {`
  // Drop `export namespace Foo {`
  replacements.remove(sf, startNode.getStart(), syntaxList.getFullStart());

  // drop `} as const;`
  // drop `};`
  const closeBrace = syntaxList.getNextSiblingIfKindOrThrow(SyntaxKind.CloseBraceToken);
  replacements.remove(sf, closeBrace.getStart(), varOrModuleDecl.getEnd());

  const kids = namespaceLike.kids;

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
        `export const ${(childNode as any).getName()} = `,
      );
    } else if (Node.isFunctionDeclaration(childNode)) {
      // namespace
      renameVariablesInBody(exportedNames, replacements, childNode);
    } else if (Node.isVariableStatement(childNode)) {
      // namespace
      // do nothing!
    } else if (Node.isInterfaceDeclaration(childNode) || Node.isTypeAliasDeclaration(childNode)) {
      // Do nothing here either. We continue to export if it was exported otherwise we leave it as is.
    } else if (childNode.isKind(SyntaxKind.SingleLineCommentTrivia)) {
      // We can just let the comments fall through
    } else {
      replacements.logger.error(
        "unwrapNamespaceInFile(): Unexpected kind %s",
        getSimplifiedNodeInfoAsString(childNode),
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
  varDecl: VariableDeclaration | ModuleDeclaration,
  replacements: Replacements,
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
  propOrMethod: MethodDeclaration | FunctionDeclaration | SyntaxList,
) {
  const logger = replacements.logger.child({
    banNames: [...banNames].join(", "),
    primaryNode: propOrMethod,
  });
  const symbolsInScope = getSymbolsExclusiveToFunctionBody(propOrMethod, replacements.logger);

  logger.trace(
    "propOrMethod name: %s",
    Node.hasName(propOrMethod) ? propOrMethod.getName() : propOrMethod.getKindName(),
  );
  logger.trace("Symbols in scope: %s", [...symbolsInScope].map((a) => a.getName()).join(", "));

  for (const sym of symbolsInScope) {
    if (!banNames.has(sym.getName())) continue;
    const decl = sym.getDeclarations()[0];
    if (!decl) continue;
    if (
      Node.isFunctionDeclaration(decl) ||
      Node.isVariableDeclaration(decl) ||
      Node.isBindingElement(decl) ||
      Node.isBindingNamed(decl)
    ) {
      // need to rename this
      const nameNode = decl.getNameNode()!.asKindOrThrow(SyntaxKind.Identifier);
      autorenameIdentifierAndReferences(replacements, nameNode, propOrMethod, banNames);
    }
  }
}

// This is wrong, it should be the symbols in scope that are not in the parent scope
export function getSymbolsExclusiveToFunctionBody(
  node: MethodDeclaration | FunctionDeclaration | SyntaxList,
  passedLogger: Logger,
) {
  const logger = passedLogger.child({ primaryNode: node });

  const body = Node.isSyntaxList(node) ? node : node.getBody();
  if (!body) {
    passedLogger.info(
      "Skipping over a node without a body: %s",
      getSimplifiedNodeInfoAsString(node),
    );
    return new Set<Symbol>();
  }
  const set = new Set(body.getSymbolsInScope(SymbolFlags.Value));

  for (const sym of set) {
    if (
      sym.getDeclarations().length == 0 ||
      !sym
        .getDeclarations()
        .every((d) => d.getSourceFile() === node.getSourceFile() && d.getAncestors().includes(node))
    ) {
      set.delete(sym);
    }
  }

  logger.debug(
    "Discovered exclusive in body scope: %s",
    [...set].map((a) => a.getName()).join(", "),
  );

  return set;
}

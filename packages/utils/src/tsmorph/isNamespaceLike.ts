import type { ObjectLiteralElementLike, SyntaxList, VariableDeclaration } from "ts-morph";
import { Node, SyntaxKind } from "ts-morph";

export function getNamespaceLike(node: Node):
  | {
      syntaxList: SyntaxList;
      startNode: Node;
      kids: Node[] | ObjectLiteralElementLike[];
      varDecl?: VariableDeclaration | undefined;
    }
  | undefined {
  if (Node.isModuleDeclaration(node)) {
    return {
      syntaxList: node.getChildSyntaxListOrThrow(),
      startNode: node,
      kids: node.getChildSyntaxListOrThrow().getChildren(),
    };
  }

  if (Node.isVariableDeclaration(node)) {
    return getNamespaceLikeVariable(node);
  }

  if (!Node.isVariableStatement(node)) return undefined;

  if (node.getDeclarations().length != 1) return undefined;
  const varDecl = node.getDeclarations()[0];

  return getNamespaceLikeVariable(varDecl);
}

export function getNamespaceLikeVariable(varDecl: VariableDeclaration) {
  const asExpression = varDecl.getInitializerIfKind(SyntaxKind.AsExpression);
  if (!asExpression) return undefined;

  const typeRef = asExpression.getTypeNode()?.asKind(SyntaxKind.TypeReference);
  if (!typeRef || typeRef.getText() != "const") return undefined;

  const objLiteral = asExpression.getExpressionIfKind(SyntaxKind.ObjectLiteralExpression);
  if (!objLiteral) return undefined;

  const methodsOnly = objLiteral.getProperties().every((a) => {
    if (Node.isMethodDeclaration(a)) return true;
    if (!Node.isPropertyAssignment(a)) return false;

    return a.getInitializerIfKind(SyntaxKind.ArrowFunction) != null;
  });
  if (!methodsOnly) return undefined;

  return {
    methodsOnly,
    objLiteral,
    typeRef,
    asExpression,
    varDecl,
    startNode: varDecl.getFirstAncestorByKindOrThrow(SyntaxKind.VariableStatement),
    syntaxList: objLiteral.getChildSyntaxListOrThrow(),
    kids: objLiteral.getProperties(),
  };
}

export function getNamespaceLikeVariableOrThrow(varDecl: VariableDeclaration) {
  const ret = getNamespaceLikeVariable(varDecl);
  if (!ret) throw "bad";
  return ret;
}

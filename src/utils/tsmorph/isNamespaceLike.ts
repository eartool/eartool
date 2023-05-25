import type {
  ObjectLiteralExpression,
  VariableStatement,
  VariableDeclaration,
  AsExpression,
  MethodDeclaration,
  ArrowFunction,
} from "ts-morph";
import { Node, SyntaxKind } from "ts-morph";
import type { ReplaceMethodReturnType } from "./ReplaceMethodReturnType.js";
import type { TypedPropertyAssignment } from "./types.js";

type ObjectLiteralWithMethodLikeOnly = ReplaceMethodReturnType<
  ObjectLiteralExpression,
  "getProperties",
  (MethodDeclaration | TypedPropertyAssignment<ArrowFunction>)[]
>;

export type NamespaceLikeDeclaration = ReplaceMethodReturnType<
  VariableDeclaration,
  "getInitializer",
  ReplaceMethodReturnType<AsExpression, "getExpression", ObjectLiteralWithMethodLikeOnly>
>;

export type NamespaceLike = ReplaceMethodReturnType<
  VariableStatement,
  "getDeclarations",
  NamespaceLikeDeclaration[]
>;

export function isNamespaceLike(node: Node): node is NamespaceLike {
  if (!Node.isVariableStatement(node)) return false;

  if (node.getDeclarations().length != 1) return false;
  const varDecl = node.getDeclarations()[0];

  const asExpression = varDecl.getInitializerIfKind(SyntaxKind.AsExpression);
  if (!asExpression) return false;

  const typeRef = asExpression.getTypeNode()?.asKind(SyntaxKind.TypeReference);
  if (!typeRef || typeRef.getText() != "const") return false;

  const objLiteral = asExpression.getExpressionIfKind(SyntaxKind.ObjectLiteralExpression);
  if (!objLiteral) return false;

  const methodsOnly = objLiteral.getProperties().every((a) => {
    if (Node.isMethodDeclaration(a)) return true;
    if (!Node.isPropertyAssignment(a)) return false;

    return a.getInitializerIfKind(SyntaxKind.ArrowFunction) != null;
  });
  if (!methodsOnly) return false;

  return true;
}

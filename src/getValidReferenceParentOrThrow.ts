import * as Assert from "node:assert";
import { Logger } from "pino";
import { Node, PropertyAccessExpression, QualifiedName, TypeReferenceNode } from "ts-morph";

export function getValidReferenceParentOrThrow(
  r: Node,
  logger: Logger
): PropertyAccessExpression | QualifiedName | TypeReferenceNode {
  const parent = r.getParentOrThrow();

  logger.trace(
    "Parent type: %s at %s:%d",
    parent?.getKindName(),
    parent?.getSourceFile().getFilePath(),
    parent?.getStartLineNumber()
  );
  logger.flush();

  Assert.ok(
    Node.isPropertyAccessExpression(parent) ||
      Node.isQualifiedName(parent) ||
      Node.isTypeReference(parent),
    `Unexpected parent kind '${parent?.getKindName()}': ${parent
      ?.getSourceFile()
      .getFilePath()}:${parent?.getStartLineNumber()}`
  );
  return parent as any;
}

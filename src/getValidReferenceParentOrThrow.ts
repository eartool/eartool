import * as Assert from "node:assert";
import { Node, PropertyAccessExpression, QualifiedName } from "ts-morph";

export function getValidReferenceParentOrThrow(r: Node): PropertyAccessExpression | QualifiedName {
  const parent = r.getParent();
  Assert.ok(
    parent &&
    (Node.isPropertyAccessExpression(parent) ||
      Node.isQualifiedName(parent))
  );
  return parent;
}

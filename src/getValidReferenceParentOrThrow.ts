import { Node } from "ts-morph";
import * as Assert from "node:assert";

export function getValidReferenceParentOrThrow(r: Node) {
  const parent = r.getParent();
  Assert.ok(
    parent &&
    (Node.isPropertyAccessExpression(parent) ||
      Node.isQualifiedName(parent))
  );
  return parent;
}

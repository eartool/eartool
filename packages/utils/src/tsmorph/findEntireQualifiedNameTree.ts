import { isAnyOf } from "@reduxjs/toolkit";
import { Node } from "ts-morph";
import type { Identifier, PropertyAccessExpression, QualifiedName } from "ts-morph";

/**
 * Given a node (that should be an Identifier), find the qualified name tree that matches
 * the provided path.
 *
 * Example:
 *   * code: `export type Bleh = Foo.Bar.Baz`;
 *   * node: is the identifier for `Foo`.
 *   * if `path` is `['Foo', 'Bar']`, then the return value
 *     will be a QualifiedName with the right side being the Foo identifier and Bar being the right
 *   * if `path` is `['Foo', 'Bar', 'Baz']`, then the return value will be approx
 *     `QualifiedName{ QualifiedName{ 'Foo', 'Bar' }, 'Baz' }
 *
 * @param initialNode
 * @param path
 * @returns
 */
export function findEntireQualifiedNameTree(
  initialNode: Node,
  path: string[]
): Identifier | QualifiedName | PropertyAccessExpression | undefined {
  if (!Node.isIdentifier(initialNode) || initialNode.getText() != path[0]) return undefined;

  let cur: Identifier | QualifiedName | PropertyAccessExpression = initialNode;
  for (let i = 1; i < path.length; i++) {
    const parent: QualifiedName | PropertyAccessExpression | undefined = cur.getParentIf(
      isAnyOf(Node.isQualifiedName, Node.isPropertyAccessExpression)
    );
    if (!parent) return undefined;
    if (Node.isQualifiedName(parent)) {
      if (parent.getRight().getText() !== path[i]) return undefined;
    }
    if (Node.isPropertyAccessExpression(parent)) {
      if (parent.getName() !== path[i]) return undefined;
    }

    cur = parent;
  }

  return cur;
}

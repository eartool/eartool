import * as Assert from "node:assert";
import { type Logger } from "pino";
import {
  type Identifier,
  Node,
  PropertyAccessExpression,
  QualifiedName,
  TypeReferenceNode,
} from "ts-morph";

export function getRelevantNodeFromRefOrThrow(
  r: Node,
  logger: Logger
): PropertyAccessExpression | QualifiedName | TypeReferenceNode | Node {
  const parent = r.getParentOrThrow();

  logger.trace(
    "Parent type: %s at %s:%d",
    parent?.getKindName(),
    parent?.getSourceFile().getFilePath(),
    parent?.getStartLineNumber()
  );
  logger.flush();

  if (Node.isPropertyAccessExpression(parent) || Node.isQualifiedName(parent)) {
    return parent;
  } else {
    return r;
  }
}

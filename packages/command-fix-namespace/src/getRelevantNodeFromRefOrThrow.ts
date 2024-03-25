import { getSimplifiedNodeInfoAsString } from "@eartool/utils";
import type { Logger } from "pino";
import {
  Node,
  type PropertyAccessExpression,
  type QualifiedName,
  type TypeReferenceNode,
} from "ts-morph";

export function getRelevantNodeFromRefOrThrow(
  r: Node,
  oldName: string,
  logger: Logger,
): PropertyAccessExpression | QualifiedName | TypeReferenceNode | Node {
  const parent = r.getParentOrThrow();

  logger.trace(
    "Parent type: %s at %s:%d",
    getSimplifiedNodeInfoAsString(parent),
    parent.getSourceFile().getFilePath(),
    parent.getStartLineNumber(),
  );
  logger.flush();

  if (Node.isPropertyAccessExpression(parent) && parent.getName() === oldName) {
    // If the reference is within a namespace currently, then it won't have a parent with
    // the same name as the namespace. Therefore we found the thing to rename already abd
    // dont want the parent
    return parent;
  }

  if (Node.isQualifiedName(parent) && parent.getRight().getText() === oldName) {
    return parent;
  } else {
    return r;
  }
}

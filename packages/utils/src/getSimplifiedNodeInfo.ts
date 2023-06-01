import { Node } from "ts-morph";

// TODO MOVE THIS

export const getSimplifiedNodeInfo = (n: Node) => ({
  filePath: n.getSourceFile().getFilePath() as string,
  startLineNumber: n.getStartLineNumber(),
  ancestry: n
    .getAncestors()
    .map((a) => a.getKindName() + (Node.hasName(a) ? `: ${a.getName()}` : "")),
  kind: n.getKindName(),
  name: Node.hasName(n) ? n.getName() : undefined,
});

export function getSimplifiedNodeInfoAsString(n: Node) {
  return `${n.getKindName()}${Node.hasName(n) ? `:${n.getName()}` : ""} (${n
    .getSourceFile()
    .getFilePath()}:${n.getStartLineNumber()}) < ${n
    .getAncestors()
    .map((a) => a.getKindName())
    .join(" < ")}`;
}

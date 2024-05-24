import { Node } from "ts-morph";

export const getSimplifiedNodeInfo = (n: Node) => ({
  filePath: n.getSourceFile().getFilePath() as string,
  startLineNumber: n.getStartLineNumber(),
  ancestry: n.getAncestors().map(kindNameWithName),
  kind: n.getKindName(),
  name: Node.hasName(n) ? n.getName() : undefined,
});

const kindNameWithName = (a: Node) => a.getKindName() + (Node.hasName(a) ? `: ${a.getName()}` : "");

export function getSimplifiedNodeInfoAsString(n: Node) {
  if (!n) return "null";
  if (typeof n === "string") return `${n} (BUT THIS SHOULD HAVE BEEN A NODE)`;
  try {
    return `${n.getKindName()}${
      Node.hasName(n) ? `:${n.getName()}` : ""
    } (${n.getSourceFile().getFilePath()}:${n.getStartLineNumber()}) < ${
      n
        .getAncestors()
        .map(kindNameWithName)
        .join(" < ")
    }`;
  } catch (err) {
    return "FATAL ERROR! Unable to get simplified node info as string! " + n;
  }
}

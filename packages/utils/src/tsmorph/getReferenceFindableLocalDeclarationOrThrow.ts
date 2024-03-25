import * as Assert from "node:assert";
import { Node, type ReferenceFindableNode } from "ts-morph";

/** returns the first findable local declaration */
export function getReferenceFindableLocalDeclarationOrThrow(
  node: Node,
  name: string,
): ReferenceFindableNode & Node {
  const originalSymbol = node.getLocalOrThrow(name);
  const decls = originalSymbol.getDeclarations();
  const ret = decls[0];
  Assert.ok(Node.isReferenceFindable(ret), "Invariant failed. How is this not findable?");
  return ret;
}

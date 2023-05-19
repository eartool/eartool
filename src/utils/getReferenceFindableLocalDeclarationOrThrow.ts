import * as Assert from "node:assert";
import { Node, type ReferenceFindableNode } from "ts-morph";

export function getReferenceFindableLocalDeclarationOrThrow(
  node: Node,
  name: string
): ReferenceFindableNode & Node {
  const originalSymbol = node.getLocalOrThrow(name);
  // should ony be one
  // FIXME I think this fails if there is a type by the same name?
  const decls = originalSymbol.getDeclarations();
  Assert.ok(decls.length == 1, "Got more than one declaration!");
  const ret = decls[0];
  Assert.ok(Node.isReferenceFindable(ret), "Invariant failed. How is this not findable?");
  return ret;
}

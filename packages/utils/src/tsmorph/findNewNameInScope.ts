import type { Node } from "ts-morph";

/**
 * @param name
 * @param scope
 * @param ban
 * @returns
 */
export function findNewNameInScope(name: string, scope: Node, ban: ReadonlySet<string>) {
  let maybeName = name;
  let count = 0;

  while (scope.getLocal(maybeName) != null || ban.has(maybeName)) {
    maybeName = `${name}${count++}`;
  }
  return maybeName;
}

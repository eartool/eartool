import * as Assert from "node:assert";
import { Node, SourceFile } from "ts-morph";
import { getNewName } from "./getNewName.js";
import { Logger } from "pino";

export function renameOriginalSymbols(
  toRename: Set<string>,
  sf: SourceFile,
  namespaceName: string,
  logger: Logger
) {
  for (const originalName of toRename) {
    logger = logger.child({ toRename: originalName });
    logger.trace("Checking");
    const sym = sf.getLocalOrThrow(originalName);

    const decls = sym.getDeclarations();
    Assert.strictEqual(decls.length, 1, "invariant failure. how are there multiple");

    const decl = decls[0];

    if (
      !Node.isVariableDeclaration(decl) &&
      !Node.isInterfaceDeclaration(decl) &&
      !Node.isTypeAliasDeclaration(decl) &&
      !Node.isNameable(decl)
    ) {
      logger.error("Expected a name for %s in statement `%s`", decl.getKindName(), decl.print());

      throw new Error("invariant failure. why is there no name!");
    }

    decl.rename(getNewName(decl, namespaceName));
  }
}

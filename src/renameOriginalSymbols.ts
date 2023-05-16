import * as Assert from "node:assert";
import { Node } from "ts-morph";
import { getNewName } from "./getNewName.js";
import type { Context } from "./Context.js";

export function renameOriginalSymbols(context: Context) {
  for (const originalName of context.typeRenames) {
    renameOriginalSymbol(
      { ...context, logger: context.logger.child({ toRename: originalName }) },
      originalName
    );
  }

  for (const originalName of context.concreteRenames) {
    renameOriginalSymbol(
      { ...context, logger: context.logger.child({ toRename: originalName }) },
      originalName
    );
  }
}

function renameOriginalSymbol(
  { logger, targetSourceFile, namespaceName }: Context,
  originalName: string
) {
  const { localName, importName } = getNewName(originalName, namespaceName);

  logger.trace(`Tring to rename symbol ${namespaceName}.${originalName} => ${localName}/${importName}`);
  const sym = targetSourceFile.getLocalOrThrow(originalName);

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

  decl.rename(localName);
}

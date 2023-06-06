import * as Assert from "node:assert";
import { Node } from "ts-morph";
import { getNewName } from "./getNewName.js";
import type { NamespaceContext } from "@eartool/replacements";

export function renameOriginalSymbols(context: NamespaceContext) {
  for (const originalName of context.typeRenames) {
    renameOriginalSymbol(context, originalName);
  }

  for (const originalName of context.concreteRenames) {
    renameOriginalSymbol(context, originalName);
  }
}

function renameOriginalSymbol(context: NamespaceContext, originalName: string) {
  const { localName, importName } = getNewName(originalName, context.namespaceName);

  context.logger.trace(
    `Tring to rename symbol ${context.namespaceName}.${originalName} => ${localName}/${importName}`
  );
  const sym = context.targetSourceFile.getLocalOrThrow(originalName);

  const decls = sym.getDeclarations();
  Assert.strictEqual(decls.length, 1, "invariant failure. how are there multiple");

  const decl = decls[0];

  if (
    !Node.isVariableDeclaration(decl) &&
    !Node.isInterfaceDeclaration(decl) &&
    !Node.isTypeAliasDeclaration(decl) &&
    !Node.isNameable(decl)
  ) {
    context.logger.error(
      "Expected a name for %s in statement `%s`",
      decl.getKindName(),
      decl.print()
    );

    throw new Error("invariant failure. why is there no name!");
  }

  context.logger.trace(context.targetSourceFile.getText());
  context.addReplacementForNode(decl, localName);
}

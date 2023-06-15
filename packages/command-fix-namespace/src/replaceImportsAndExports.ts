import * as Assert from "assert";
import type { ModuleDeclaration, VariableDeclaration } from "ts-morph";
import { Node } from "ts-morph";
import type { Replacements } from "@eartool/replacements";
import { isAnyOf } from "@reduxjs/toolkit";

export function replaceImportsAndExports(
  varDecl: VariableDeclaration | ModuleDeclaration,
  replacements: Replacements
) {
  const visitedSpecifiers = new Set();
  for (const refIdentifier of varDecl.findReferencesAsNodes()) {
    // alias import nodes show up twice for some reason
    // so we need to account for that
    const specifier = refIdentifier.getParentIf(
      isAnyOf(Node.isExportSpecifier, Node.isImportSpecifier)
    );
    if (!specifier) continue;
    if (visitedSpecifiers.has(specifier)) continue;

    const named = specifier.getParentIfOrThrow(isAnyOf(Node.isNamedExports, Node.isNamedImports));
    if (named.getElements().length != 1) continue;
    Assert.ok(
      named.getElements().length == 1,
      `Expected only one element in '${named.getText()}', file: ${named
        .getSourceFile()
        .getFilePath()} while looking for ${specifier.getText()}`
    );
    const varName = (specifier.getAliasNode() ?? specifier.getNameNode()).getText();
    replacements.replaceNode(named, `* as ${varName}`);
    visitedSpecifiers.add(specifier);
  }
}

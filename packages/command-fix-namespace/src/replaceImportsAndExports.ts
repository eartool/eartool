import * as Assert from "assert";
import type { ModuleDeclaration, VariableDeclaration } from "ts-morph";
import { Node, SyntaxKind } from "ts-morph";
import type { ProjectContext, Replacements } from "@eartool/replacements";
import { isAnyOf } from "@reduxjs/toolkit";
import { findFileLocationForImportExport } from "@eartool/utils";

export function replaceImportsAndExports(
  varDecl: VariableDeclaration | ModuleDeclaration,
  replacements: Replacements,
  projectContext: ProjectContext
) {
  const visitedSpecifiers = new Set();
  for (const refIdentifier of varDecl.findReferencesAsNodes()) {
    // console.log(getSimplifiedNodeInfoAsString(refIdentifier));
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

  // Note this assumes there is only one of the declarations for the varDecl
  if (varDecl.isKind(SyntaxKind.ModuleDeclaration)) {
    // There is a re-export case like so:
    // `export * from "./foo"` that doesn't trigger on referencesAsNodes.
    // We need to fix that to be `export * as Bleh from "./foo"` and we need to fix places that
    // were importing from this file as well
    for (const sf of varDecl.getSourceFile().getProject().getSourceFiles()) {
      for (const exportDecl of sf
        .getChildSyntaxListOrThrow()
        .getChildrenOfKind(SyntaxKind.ExportDeclaration)) {
        if (exportDecl.getModuleSpecifierValue()) {
          if (
            findFileLocationForImportExport(projectContext, exportDecl) ==
            varDecl.getSourceFile().getFilePath()
          ) {
            if (exportDecl.isNamespaceExport() && exportDecl.getNamespaceExport() === undefined) {
              replacements.replaceNode(
                exportDecl.getLastChildByKindOrThrow(SyntaxKind.AsteriskToken),
                `* as ${varDecl.getName()}`
              );
            }
          }
        }
      }
    }
  }
}

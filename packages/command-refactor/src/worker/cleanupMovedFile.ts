/* eslint-disable no-console */
import {
  addImportOrExport,
  getDeclaration,
  getNamedSpecifiers,
  type Replacements,
} from "@eartool/replacements";
import { getSimplifiedNodeInfoAsString, type PackageName } from "@eartool/utils";
import { SyntaxKind, type SourceFile } from "ts-morph";
import { getRootFile } from "../getRootFile.js";

export function cleanupMovedFile(
  sf: SourceFile,
  packageName: PackageName,
  replacements: Replacements,
  dryRun: boolean
) {
  const rootFile = getRootFile(sf.getProject());
  const decls = [
    ...sf.getImportDeclarations().filter((a) => a.getModuleSpecifierValue() == packageName),
    ...sf.getExportDeclarations().filter((a) => a.getModuleSpecifierValue() == packageName),
  ];

  for (const decl of decls) {
    console.log(decl.getText());
    for (const namedImport of getNamedSpecifiers(decl)) {
      console.log(namedImport.getText());
      const rootExportedSymbol = rootFile
        ?.getExportSymbols()
        .find((s) => s.getName() == namedImport.getText());

      for (const rootExportedDecl of rootExportedSymbol?.getDeclarations() ?? []) {
        console.log(getSimplifiedNodeInfoAsString(rootExportedDecl));
        if (rootExportedDecl.isKind(SyntaxKind.ExportSpecifier)) {
          const newModuleSpecifier = rootExportedDecl
            .getExportDeclaration()
            .getModuleSpecifierValue()!;

          console.log(newModuleSpecifier);

          addImportOrExport(replacements, namedImport, undefined, newModuleSpecifier, false);
        }
        console.log(getSimplifiedNodeInfoAsString(rootExportedDecl));
      }

      // console.log(getSimplifiedNodeInfoAsString(q));
      replacements.replaceNode(getDeclaration(namedImport), "");
    }
    if (decl.isKind(SyntaxKind.ImportDeclaration) && decl.getDefaultImport()) {
      throw new Error("not implemented");
    }
  }
}

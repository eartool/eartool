 
import { addImportOrExport, getDeclaration, getNamedSpecifiers } from "@eartool/replacements";
import { SyntaxKind, type SourceFile } from "ts-morph";
import { getRootFile } from "../getRootFile.js";
import type { WorkerPackageContext } from "./WorkerPackageContext.js";

export function cleanupMovedFile(ctx: WorkerPackageContext, sf: SourceFile) {
  const rootFile = getRootFile(sf.getProject());
  const decls = [
    ...sf.getImportDeclarations().filter((a) => a.getModuleSpecifierValue() == ctx.packageName),
    ...sf.getExportDeclarations().filter((a) => a.getModuleSpecifierValue() == ctx.packageName),
  ];

  for (const decl of decls) {
    for (const namedImport of getNamedSpecifiers(decl)) {
      const rootExportedSymbol = rootFile
        ?.getExportSymbols()
        .find((s) => s.getName() == namedImport.getText());

      for (const rootExportedDecl of rootExportedSymbol?.getDeclarations() ?? []) {
        if (rootExportedDecl.isKind(SyntaxKind.ExportSpecifier)) {
          const newModuleSpecifier = rootExportedDecl
            .getExportDeclaration()
            .getModuleSpecifierValue()!;

          addImportOrExport(ctx.replacements, namedImport, undefined, newModuleSpecifier, false);
        }
      }

      ctx.replacements.deleteNode(getDeclaration(namedImport));
    }
    if (decl.isKind(SyntaxKind.ImportDeclaration) && decl.getDefaultImport()) {
      throw new Error("not implemented");
    }
  }
}

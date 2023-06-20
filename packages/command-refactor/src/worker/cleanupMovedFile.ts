import * as path from "node:path";
import { addImportOrExport, getNamedSpecifiers } from "@eartool/replacements";
import { SyntaxKind, type SourceFile } from "ts-morph";
import { getProperRelativePathAsModuleSpecifierTo } from "@eartool/utils";
import { getRootFile } from "../getRootFile.js";
import type { WorkerPackageContext } from "./WorkerPackageContext.js";

export function cleanupMovedFile(ctx: WorkerPackageContext, sf: SourceFile) {
  const rootFile = getRootFile(sf.getProject());
  const decls = [
    ...sf.getImportDeclarations().filter((a) => a.getModuleSpecifierValue() == ctx.packageName),
    ...sf.getExportDeclarations().filter((a) => a.getModuleSpecifierValue() == ctx.packageName),
  ];

  for (const decl of decls) {
    ctx.logger.debug("handling %s", decl.getText());
    for (const namedImport of getNamedSpecifiers(decl)) {
      const rootExportedSymbol = rootFile
        ?.getExportSymbols()
        .find((s) => s.getName() == namedImport.getText());

      for (const rootExportedDecl of rootExportedSymbol?.getDeclarations() ?? []) {
        if (rootExportedDecl.isKind(SyntaxKind.ExportSpecifier)) {
          const blh = rootExportedDecl.getExportDeclaration().getModuleSpecifierValue()!;

          const fullPath = path.resolve(rootExportedDecl.getSourceFile().getDirectoryPath(), blh);

          // this path needs to be relative to the file we are doing now, not the index.ts file
          addImportOrExport(
            ctx.replacements,
            namedImport,
            undefined,
            getProperRelativePathAsModuleSpecifierTo(sf, fullPath),
            false
          );
        }
      }
    }

    ctx.replacements.deleteNode(decl);
    // deleted.add(getDeclaration().)
    if (decl.isKind(SyntaxKind.ImportDeclaration) && decl.getDefaultImport()) {
      throw new Error("not implemented");
    }
  }
}

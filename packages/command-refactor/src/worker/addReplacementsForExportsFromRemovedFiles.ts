import { findFileLocationForImportExport, type FilePath } from "@eartool/utils";
import type { SourceFile } from "ts-morph";
import type { WorkerPackageContext } from "./WorkerPackageContext.js";

export function addReplacementsForExportsFromRemovedFiles(
  ctx: WorkerPackageContext,
  filesToRemove: Iterable<FilePath>,
  rootFile: SourceFile | undefined,
) {
  const setOfFilesToRemove = new Set(filesToRemove);
  if (setOfFilesToRemove.size === 0) return;

  if (!rootFile) throw new Error(`Couldnt find root file for ${ctx.packagePath}`);

  if (setOfFilesToRemove.size == 0) return;

  for (const decl of rootFile.getExportDeclarations()) {
    if (!decl.getModuleSpecifierValue()?.startsWith(".")) continue;
    const specifierFullFilePath = findFileLocationForImportExport(ctx, decl);
    if (specifierFullFilePath && setOfFilesToRemove.has(specifierFullFilePath)) {
      ctx.logger.info(`Deleting ${decl.getText()} from ${rootFile.getFilePath()}`);
      ctx.replacements.deleteNode(decl);
    }
  }
}

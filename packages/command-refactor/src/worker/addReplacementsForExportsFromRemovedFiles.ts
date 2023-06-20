import type { FilePath } from "@eartool/utils";
import { getRootFile } from "@eartool/utils";
import type { WorkerPackageContext } from "./WorkerPackageContext.js";

export function addReplacementsForExportsFromRemovedFiles(
  ctx: WorkerPackageContext,
  filesToRemove: Iterable<FilePath>
) {
  const setOfFilesToRemove = new Set(filesToRemove);
  if (setOfFilesToRemove.size === 0) return;

  const rootFile = getRootFile(ctx.project);
  if (!rootFile) throw new Error(`Couldnt find root file for ${ctx.packagePath}`);

  if (setOfFilesToRemove.size == 0) return;

  for (const decl of rootFile.getExportDeclarations()) {
    const specifierFullFilePath = decl.getModuleSpecifierSourceFile()?.getFilePath();
    if (specifierFullFilePath && setOfFilesToRemove.has(specifierFullFilePath)) {
      ctx.logger.info(`Deleting ${decl.getText()} from ${rootFile.getFilePath()}`);
      ctx.replacements.deleteNode(decl);
    }
  }
}

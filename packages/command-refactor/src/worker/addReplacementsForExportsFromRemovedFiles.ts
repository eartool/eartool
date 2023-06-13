import type { FilePath } from "@eartool/utils";
import { getRootFile } from "../getRootFile.js";
import type { WorkerPackageContext } from "./WorkerPackageContext.js";

export function addReplacementsForExportsFromRemovedFiles(
  ctx: WorkerPackageContext,
  filesToRemove: Iterable<FilePath>
) {
  const rootFile = getRootFile(ctx.project);
  if (!rootFile) throw new Error("Couldnt find root file");

  const setOfFilesToRemove = new Set(filesToRemove);
  if (setOfFilesToRemove.size == 0) return;

  for (const decl of rootFile.getExportDeclarations()) {
    const specifierFullFilePath = decl.getModuleSpecifierSourceFile()?.getFilePath();
    if (specifierFullFilePath && setOfFilesToRemove.has(specifierFullFilePath)) {
      ctx.logger.info(`Deleting ${decl.getText()} from ${rootFile.getFilePath()}`);
      ctx.replacements.replaceNode(decl, "");
    }
  }
}

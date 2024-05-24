import type { FilePath } from "@eartool/utils";
import path from "node:path";
import type { WorkerPackageContext } from "./WorkerPackageContext.js";

export function removeFilesIfInProject(
  ctx: WorkerPackageContext,
  filesToRemove: Iterable<FilePath>,
) {
  ctx.logger.info(
    { filesToRemove: [...filesToRemove].map((a) => path.relative(ctx.packagePath, a)) },
    "Deleting files",
  );
  for (const path of filesToRemove) {
    const sf = ctx.project.getSourceFile(path);
    if (!sf) continue;

    sf.delete();
  }
}

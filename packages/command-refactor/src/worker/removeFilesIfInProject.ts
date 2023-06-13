import type { FilePath } from "@eartool/utils";
import type { Logger } from "pino";
import type { Project } from "ts-morph";
import type { WorkerPackageContext } from "./WorkerPackageContext.js";

export function removeFilesIfInProject(
  ctx: WorkerPackageContext,
  filesToRemove: Iterable<FilePath>
) {
  for (const path of filesToRemove) {
    const sf = ctx.project.getSourceFile(path);
    if (!sf) continue;

    ctx.logger.info("Deleting %s.", path);

    sf.delete();
  }
}

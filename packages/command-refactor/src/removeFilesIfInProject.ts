import type { FilePath } from "@eartool/utils";
import type { Logger } from "pino";
import type { Project } from "ts-morph";

export function removeFilesIfInProject(
  filesToRemove: Iterable<FilePath>,
  project: Project,
  logger: Logger
) {
  for (const path of filesToRemove) {
    const sf = project.getSourceFile(path);
    if (!sf) continue;

    logger.info("Deleting %s.", path);

    sf.delete();
  }
}

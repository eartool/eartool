import type { Logger } from "pino";
import type { Project } from "ts-morph";

export function removeFilesIfInProject(
  filesToMove: string[],
  project: Project,
  logger: Logger,
  dryRun: boolean
) {
  for (const path of filesToMove) {
    const sf = project.getSourceFile(path);
    if (!sf) continue;

    if (dryRun) {
      logger.info("DRYRUN: Would be deleting %s.", path);
    }

    project.removeSourceFile(sf);
  }
}

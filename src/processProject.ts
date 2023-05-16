import { Project } from "ts-morph";
import { processFile } from "./processFile.js";
import { Logger } from "pino";

export async function processProject(
  project: Project,
  { dryRun = false, logger }: { dryRun?: boolean; logger: Logger }
) {
  for (const sf of project.getSourceFiles()) {
    if (sf.getFilePath().endsWith(".d.ts")) {
      project.removeSourceFile(sf);
    }
  }

  for (const sf of project.getSourceFiles()) {
    processFile(sf, logger);
  }

  logger.debug("Organizing imports");
  for (const sf of project.getSourceFiles()) {
    sf.organizeImports();
  }

  if (dryRun) {
    logger.info("DRY RUN");
  } else {
    logger.info("Saving");
    await project.save();
  }
}

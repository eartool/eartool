import type { Project } from "ts-morph";
import { processFile } from "./processFile.js";
import type { Logger } from "pino";
import { ProjectContext } from "./Context.js";
import { processReplacements } from "./replacements/processReplacements.js";
import { dropDtsFiles } from "./utils/dropDtsFiles.js";
import { organizeImportsOnFiles } from "./utils/organizeImportsOnFiles.js";

export interface ProcessProjectOpts {
  dryRun?: boolean;
  logger: Logger;
  updateState?: (data: { totalFiles: number; processedFiles: number }) => void;
}

export async function processProject(
  project: Project,
  { dryRun = false, logger, updateState = (_data) => undefined }: ProcessProjectOpts
) {
  dropDtsFiles(project);
  const context = new ProjectContext(project, logger);
  const totalFiles = project.getSourceFiles().length;
  updateState({ totalFiles, processedFiles: 0 });

  let count = 0;
  for (const sf of project.getSourceFiles()) {
    processFile(sf, context);
    updateState({ totalFiles, processedFiles: ++count });
  }

  const changedFiles = processReplacements(project, context.getReplacements());

  logger.debug("Organizing imports");
  organizeImportsOnFiles(project, changedFiles);

  if (dryRun) {
    logger.info("DRY RUN");
  } else {
    logger.info("Saving");
    await project.save();
  }

  return {
    exportedRenames: context.getRecordedRenames(),
  };
}

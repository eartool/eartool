import type { Project } from "ts-morph";
import { processFile } from "./processFile.js";
import type { Logger } from "pino";
import { ProjectContext } from "./Context.js";
import { processReplacements } from "./replacements/processReplacements.js";
import { dropDtsFiles } from "./utils/dropDtsFiles.js";
import { organizeImportsOnFiles } from "./utils/organizeImportsOnFiles.js";
import type { PackageExportRename } from "./PackageExportRename.js";
import type { PackageName } from "./PackageName.js";
import { calculateReplacementsForRenames } from "./replacements/calculateReplacementsForRenames.js";

export interface ProcessProjectOpts {
  dryRun?: boolean;
  logger: Logger;
  updateState?: (data: { totalFiles: number; processedFiles: number }) => void;
  additionalRenames?: Record<PackageName, PackageExportRename[]>;
}

export async function processProject(
  project: Project,
  {
    dryRun = false,
    logger,
    updateState = (_data) => undefined,
    additionalRenames,
  }: ProcessProjectOpts
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

  const replacements = context.getReplacements();
  if (additionalRenames) {
    for (const r of calculateReplacementsForRenames(project, additionalRenames)) {
      const arr = replacements.get(r.filePath) ?? [];
      arr.push(r);
      replacements.set(r.filePath, arr);
    }
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

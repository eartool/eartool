import type { Project } from "ts-morph";
import { calculateNamespaceRemovals } from "./calculateNamespaceRemovals.js";
import type { Logger } from "pino";
import { ProjectContext } from "./Context.js";
import { processReplacements } from "./replacements/processReplacements.js";
import { dropDtsFiles } from "./utils/tsmorph/dropDtsFiles.js";
import { organizeImportsOnFiles } from "./utils/tsmorph/organizeImportsOnFiles.js";
import type { PackageExportRename } from "./replacements/PackageExportRename.js";
import type { PackageName } from "./PackageName.js";
import { getReplacementsForRenames as getReplacementsForRenames } from "./replacements/getReplacementsForRenames.js";
import { addSingleFileReplacementsForRenames } from "./replacements/addSingleFileReplacementsForRenames.js";
import type { Replacement } from "./replacements/Replacement.js";

export interface Status {
  totalFiles: number;
  filesComplete: number;
  stage: "analyzing" | "writing" | "organizing";
}

export interface ProcessProjectOpts {
  dryRun?: boolean;
  logger: Logger;
  removeNamespaces: boolean;
  updateState?: (data: Status) => void;
  additionalRenames?: Map<PackageName, PackageExportRename[]>;
}

export async function processProject(
  project: Project,
  {
    dryRun = false,
    logger,
    updateState = (_data) => undefined,
    additionalRenames,
    removeNamespaces,
  }: ProcessProjectOpts
) {
  dropDtsFiles(project);
  const context = new ProjectContext(project, logger);
  const totalFiles = project.getSourceFiles().length;
  updateState({ totalFiles, filesComplete: 0, stage: "analyzing" });

  logger.debug("Running with opts %o", { dryRun, removeNamespaces, additionalRenames });

  let filesComplete = 0;
  for (const sf of project.getSourceFiles()) {
    if (removeNamespaces) {
      calculateNamespaceRemovals(sf, context);
    }
    if (additionalRenames) {
      const replacements: Replacement[] = [];
      addSingleFileReplacementsForRenames(sf, additionalRenames, replacements, logger);
      for (const r of replacements) {
        context.addReplacement(r);
      }
    }
    filesComplete++;
    updateState({ totalFiles, filesComplete, stage: "analyzing" });
  }

  // actually updates files in project!
  const changedFiles = processReplacements(project, context.getReplacements());

  logger.debug("Organizing imports");
  updateState({ totalFiles, filesComplete, stage: "organizing" });
  organizeImportsOnFiles(project, changedFiles);

  updateState({ totalFiles, filesComplete, stage: "writing" });

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

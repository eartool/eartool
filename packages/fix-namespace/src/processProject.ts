import type { Node, SourceFile } from "ts-morph";
import type { Project } from "ts-morph";
import { calculateNamespaceRemovals } from "./calculateNamespaceRemovals.js";
import type { Logger } from "pino";
import { ProjectContext } from "./Context.js";
import { processReplacements } from "./replacements/processReplacements.js";
import { dropDtsFiles } from "./utils/tsmorph/dropDtsFiles.js";
import { organizeImportsOnFiles } from "./utils/tsmorph/organizeImportsOnFiles.js";
import type { PackageExportRename } from "./replacements/PackageExportRename.js";
import type { PackageName } from "./PackageName.js";
import { addSingleFileReplacementsForRenames } from "./replacements/addSingleFileReplacementsForRenames.js";
import type { Replacement } from "./replacements/Replacement.js";
import { ReplacementsWrapper } from "./ReplacementsWrapper.js";
import { calculateNamespaceLikeRemovals } from "./calculateNamespaceLikeRemovals.js";

export interface Status {
  totalWorkUnits: number;
  completedWorkUnits: number;
  stage: "analyzing" | "writing" | "organizing";
}

export interface BaseOptions {
  dryRun: boolean;
  removeNamespaces: boolean;
  removeFauxNamespaces: boolean;
  organizeImports: boolean;
}

export interface ProcessProjectOpts extends BaseOptions {
  logger: Logger;
  updateState?: (data: Status) => void;
  additionalRenames?: Map<PackageName, PackageExportRename[]>;
}

/**
 * Process a project, removing namespaces and organizing imports.
 * @param project  The project to process
 * @param param1  Options
 * @returns
 */
export async function processProject(
  project: Project,
  {
    dryRun = false,
    logger,
    updateState = (_data) => undefined,
    additionalRenames,
    removeNamespaces,
    removeFauxNamespaces,
    organizeImports: shouldOrganizeImports,
  }: ProcessProjectOpts
) {
  dropDtsFiles(project);
  const context = new ProjectContext(project, logger);
  const totalFiles = project.getSourceFiles().length;
  // Three stages:
  // * analyzing:
  //   * if `removeNamespaces`: add `totalFiles`
  //   * if `additionalRenames`: add `totalFiles`
  // * organizing `[...changedFiles].length` work.
  // * writing  `[]
  function calculateTotalWorkUnits(changedFilesCount: number) {
    return (
      (removeNamespaces ? totalFiles : 0) +
      (additionalRenames ? totalFiles : 0) +
      (additionalRenames ? totalFiles : 0) +
      (dryRun ? 0 : changedFilesCount) +
      (shouldOrganizeImports ? changedFilesCount : 0)
    );
  }

  // Assume all files change for now
  let totalWorkUnits = calculateTotalWorkUnits(totalFiles);

  let completedWorkUnits = 0;
  // TODO: Rename totalFiles here to totalWorkUnits or similar
  updateState({ totalWorkUnits, completedWorkUnits, stage: "analyzing" });

  logger.debug("Running with opts %o", {
    dryRun,
    removeNamespaces,
    additionalRenames: [...(additionalRenames?.entries() ?? [])],
  });

  for (const sf of project.getSourceFiles()) {
    if (removeNamespaces) {
      calculateNamespaceRemovals(sf, context);
      completedWorkUnits++;
      updateState({ totalWorkUnits, completedWorkUnits, stage: "analyzing" });
    }

    if (removeFauxNamespaces) {
      const replacements = new ReplacementsWrapper(context);
      calculateNamespaceLikeRemovals(sf, replacements);
      completedWorkUnits++;
      updateState({ totalWorkUnits, completedWorkUnits, stage: "analyzing" });
    }

    if (additionalRenames) {
      const replacements: Replacement[] = [];
      addSingleFileReplacementsForRenames(sf, additionalRenames, replacements, logger);
      for (const r of replacements) {
        context.addReplacement(r);
      }
      completedWorkUnits++;
      updateState({ totalWorkUnits, completedWorkUnits, stage: "analyzing" });
    }
  }

  // actually updates files in project!
  const changedFiles = [...processReplacements(project, context.getReplacements())];
  totalWorkUnits = calculateTotalWorkUnits(changedFiles.length);

  if (shouldOrganizeImports) {
    logger.debug("Organizing imports");
    updateState({ totalWorkUnits, completedWorkUnits, stage: "organizing" });
    organizeImportsOnFiles(project, changedFiles);
  }

  completedWorkUnits += changedFiles.length; // TODO make this granular?
  updateState({ totalWorkUnits, completedWorkUnits, stage: "writing" });

  if (dryRun) {
    logger.info("DRY RUN");
  } else {
    logger.info("Saving");
    await project.save();
    completedWorkUnits += changedFiles.length; // TODO make this granular?
    updateState({ totalWorkUnits, completedWorkUnits, stage: "writing" });
  }

  return {
    exportedRenames: context.getRecordedRenames(),
  };
}

export function getFilePath(filePath: string | Node) {
  return typeof filePath == "string" ? filePath : filePath.getSourceFile().getFilePath();
}

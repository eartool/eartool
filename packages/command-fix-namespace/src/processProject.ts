import type { Project } from "ts-morph";
import { calculateNamespaceRemovals } from "./calculateNamespaceRemovals.js";
import type { Logger } from "pino";
import { ProjectContext } from "@eartool/replacements";
import { processReplacements, addSingleFileReplacementsForRenames } from "@eartool/replacements";
import { dropDtsFiles, organizeImportsOnFiles } from "@eartool/utils";
import type { PackageName } from "@eartool/utils";
import type { Replacement, PackageExportRename } from "@eartool/replacements";
import { ReplacementsWrapper } from "@eartool/replacements";
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
    removeFauxNamespaces,
    organizeImports: shouldOrganizeImports,
    additionalRenames: [...(additionalRenames?.entries() ?? [])],
  });

  for (const sf of project.getSourceFiles()) {
    const replacements = new ReplacementsWrapper(context);

    if (removeNamespaces) {
      calculateNamespaceRemovals(sf, context, replacements);
      completedWorkUnits++;
      updateState({ totalWorkUnits, completedWorkUnits, stage: "analyzing" });
    }

    if (removeFauxNamespaces) {
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

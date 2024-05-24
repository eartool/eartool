import {
  addSingleFileReplacementsForRenames,
  processReplacements,
  ProjectContext,
  ReplacementsWrapperForContext,
  SimpleReplacements,
} from "@eartool/replacements";
import type { PackageExportRename } from "@eartool/replacements";
import { dropDtsFiles, organizeImportsOnFiles } from "@eartool/utils";
import type { PackageContext, PackageName } from "@eartool/utils";
import type { Logger } from "pino";
import { calculateNamespaceLikeRemovals } from "./calculateNamespaceLikeRemovals.js";
import { calculateNamespaceRemovals } from "./calculateNamespaceRemovals.js";

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
  packageContext: PackageContext,
  {
    dryRun = false,
    logger,
    updateState = (_data) => undefined,
    additionalRenames,
    removeNamespaces,
    removeFauxNamespaces,
    organizeImports: shouldOrganizeImports,
  }: ProcessProjectOpts,
) {
  const { project } = packageContext;

  dropDtsFiles(project);
  const context = new ProjectContext(
    packageContext.project,
    logger,
    packageContext.packagePath,
    packageContext.packageName,
    packageContext.packageJson,
  );
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
    const replacements = new ReplacementsWrapperForContext(context);

    if (removeNamespaces) {
      calculateNamespaceRemovals(sf, context, replacements);
      completedWorkUnits++;
      updateState({ totalWorkUnits, completedWorkUnits, stage: "analyzing" });
    }

    if (removeFauxNamespaces) {
      calculateNamespaceLikeRemovals(sf, context, replacements);
      completedWorkUnits++;
      updateState({ totalWorkUnits, completedWorkUnits, stage: "analyzing" });
    }

    if (additionalRenames) {
      const replacements = new SimpleReplacements(logger);
      addSingleFileReplacementsForRenames(context, sf, additionalRenames, replacements, dryRun);
      for (const r of replacements.getReplacementsArray()) {
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

  logger.debug("Exported renames %o", context.getRecordedRenames());

  return {
    exportedRenames: context.getRecordedRenames(),
  };
}

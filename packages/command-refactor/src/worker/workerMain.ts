import type { WorkerData } from "@eartool/batch";
import { dropDtsFiles, maybeLoadProject, organizeImportsOnFiles } from "@eartool/utils";
import { processPackageReplacements } from "./processPackageReplacements.js";
import { assignDependencyVersions } from "./assignDependencyVersions.js";
import type { JobArgs } from "../shared/JobArgs.js";
import type { WorkerPackageContext } from "./WorkerPackageContext.js";
import { SimpleReplacements } from "@eartool/replacements";

export default async function workerMain({
  packagePath,
  packageName,
  logger,
  dryRun,
  jobArgs: {
    packageExportRenamesMap,
    relativeFileInfoMap,
    filesToRemove,
    shouldOrganizeImports,
    packageJsonDepsRequired,
  },
}: WorkerData<JobArgs>) {
  const project = maybeLoadProject(packagePath);
  if (!project) {
    return {};
  }

  dropDtsFiles(project);

  const ctx: WorkerPackageContext = {
    logger,
    packageName,
    packagePath,
    project,
    replacements: new SimpleReplacements(logger),
  };

  if (packageJsonDepsRequired) {
    assignDependencyVersions(
      project,
      packagePath,
      packageName,
      packageJsonDepsRequired,
      logger,
      dryRun
    );
  }

  const changedFiles = await processPackageReplacements(
    ctx,
    filesToRemove,
    relativeFileInfoMap,
    packageExportRenamesMap,
    dryRun
  );

  if (changedFiles.length > 0 || relativeFileInfoMap.size > 0) {
    if (shouldOrganizeImports) {
      logger.debug("Organizing imports");
      organizeImportsOnFiles(project, changedFiles);
    }

    if (dryRun) {
      logger.trace("DRY RUN");
    } else {
      logger.info("Saving");
      await project.save();
    }
  }
  return { changedFiles };
}

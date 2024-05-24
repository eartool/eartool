import type { WorkerData } from "@eartool/batch";
import { SimpleReplacements } from "@eartool/replacements";
import { dropDtsFiles, maybeLoadProject, organizeImportsOnFiles } from "@eartool/utils";
import * as path from "node:path";
import type { JobArgs } from "../shared/JobArgs.js";
import { assignDependencyVersions } from "./assignDependencyVersions.js";
import { processPackageReplacements } from "./processPackageReplacements.js";
import type { WorkerPackageContext } from "./WorkerPackageContext.js";

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
    destination,
  },
}: WorkerData<JobArgs>) {
  const project = maybeLoadProject(packagePath, logger);
  if (!project) {
    logger.fatal(`Could not find project! ${packagePath}`);
    return {};
  }

  dropDtsFiles(project);

  const packageJson = JSON.parse(
    project.getFileSystem().readFileSync(path.join(packagePath, "package.json")),
  );
  const ctx: WorkerPackageContext = {
    logger,
    packageName,
    packagePath,
    project,
    replacements: new SimpleReplacements(logger),
    packageJson,
  };

  if (packageJsonDepsRequired) {
    assignDependencyVersions(
      project,
      packagePath,
      packageName,
      packageJsonDepsRequired,
      logger,
      dryRun,
    );
  }

  const changedFiles = await processPackageReplacements(
    ctx,
    filesToRemove,
    relativeFileInfoMap,
    packageExportRenamesMap,
    dryRun,
  );

  if (changedFiles.length > 0 || relativeFileInfoMap.size > 0) {
    // anything that changed at this point needs the new dep
    if (destination !== packageName) {
      // We will just assume it needs to be a regular dependency
      assignDependencyVersions(
        project,
        packagePath,
        packageName,
        { dependencies: new Map([[destination, "workspace:*"]]), devDependencies: new Map() },
        logger,
        dryRun,
      );
    }

    if (shouldOrganizeImports) {
      logger.info("Organizing imports");
      organizeImportsOnFiles(project, changedFiles, false);
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

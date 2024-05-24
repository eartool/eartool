import type { WorkerData } from "@eartool/batch";
import { maybeLoadProject, type PackageContext } from "@eartool/utils";
import * as path from "node:path";

export function createPackageContextFromWorkerData({
  packagePath,
  logger,
  packageName,
}: WorkerData<unknown>): PackageContext | undefined {
  const project = maybeLoadProject(packagePath, logger);

  if (!project) {
    logger.debug(`Skipping package due to missing tsconfig: ${packagePath}`);
    return undefined;
  }

  return {
    project,
    logger,
    packageName,
    packagePath,
    packageJson: JSON.parse(
      project.getFileSystem().readFileSync(path.join(packagePath, "package.json")),
    ),
  };
}

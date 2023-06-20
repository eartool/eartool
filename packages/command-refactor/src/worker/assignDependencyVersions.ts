import { readPackageJson, type PackageName, writePackageJson, type FilePath } from "@eartool/utils";
import type { Logger } from "pino";
import type { Project } from "ts-morph";
import type { PackageJsonDepsRequired } from "../shared/PackageJsonDepsRequired.js";

export function assignDependencyVersions(
  project: Project,
  packagePath: FilePath,
  packageName: PackageName,
  packageJsonDepsRequired: PackageJsonDepsRequired,
  logger: Logger,
  dryRun: boolean
) {
  const packageJson = readPackageJson(project.getFileSystem(), packagePath);
  for (const type of ["dependencies", "devDependencies"] as const) {
    if (packageJsonDepsRequired[type].size > 0) {
      const typeObj = packageJson[type] ?? {};
      packageJson[type] = typeObj;

      for (const [depName, depVersion] of packageJsonDepsRequired[type]) {
        if (depName == packageName) continue; // don't depend on self!
        if (typeObj[depName]) {
          if (typeObj[depName] != depVersion) {
            logger.warn(
              "Overwritting dependency version for '%s': '%s' with version '%s'",
              depName,
              typeObj[depName],
              depVersion
            );
          }
        }
        logger.info("Setting dependency version '%s': '%s'", depName, depVersion);
        typeObj[depName] = depVersion;
      }
    }
  }
  if (!dryRun) {
    writePackageJson(project.getFileSystem(), packagePath, packageJson);
  }
}

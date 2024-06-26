import type { Logger } from "pino";
import type { Project } from "ts-morph";
import type { FilePath } from "../FilePath.js";
import type { PackageName } from "../PackageName.js";

export interface PackageContext extends WithLogger {
  project: Project;
  packagePath: FilePath;
  packageName: PackageName;
  packageJson: any;
}
export interface WithLogger {
  logger: Logger;
}

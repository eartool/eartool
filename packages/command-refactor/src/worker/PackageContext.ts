import type { PackageName, FilePath } from "@eartool/utils";
import type { Project } from "ts-morph";
import type { WithLogger } from "./processPackageReplacements.js";

export interface PackageContext extends WithLogger {
  project: Project;
  packagePath: FilePath;
  packageName: PackageName;
}

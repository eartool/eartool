import type { PackageExportRename } from "@eartool/replacements";
import type { PackageName, FilePath } from "@eartool/utils";
import type { RelativeFileInfo } from "../main/setupOverall.js";
import type { PackageJsonDepsRequired } from "./PackageJsonDepsRequired.js";

export interface JobArgs {
  packageJsonDepsRequired: PackageJsonDepsRequired | undefined;
  relativeFileInfoMap: Map<FilePath, RelativeFileInfo>;
  packageExportRenamesMap: Map<FilePath | PackageName, PackageExportRename[]>;
  filesToRemove: Set<FilePath>;
  destination: string;
  primaryPackages: Set<PackageName>;
  shouldOrganizeImports: boolean;
}

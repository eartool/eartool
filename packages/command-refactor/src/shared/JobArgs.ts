import type { PackageExportRename } from "@eartool/replacements";
import type { FilePath, PackageJsonDepsRequired, PackageName } from "@eartool/utils";
import type { RelativeFileInfo } from "../main/setupOverall.js";

export interface JobArgs {
  packageJsonDepsRequired: PackageJsonDepsRequired | undefined;
  relativeFileInfoMap: Map<FilePath, RelativeFileInfo>;
  packageExportRenamesMap: Map<FilePath | PackageName, PackageExportRename[]>;
  filesToRemove: Set<FilePath>;
  destination: string;
  primaryPackages: Set<PackageName>;
  shouldOrganizeImports: boolean;
}

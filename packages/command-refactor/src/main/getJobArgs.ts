import type { FilePath } from "@eartool/utils";
import type { Logger } from "pino";
import type { JobArgs } from "../shared/JobArgs.js";
import type { RelativeFileInfo, SetupResults } from "./setupOverall.js";

export function getJobArgs(
  packageName: string,
  args: { destination: string; organizeImports: boolean } & { logger: Logger },
  {
    direction: _direction,
    packageExportRenamesMap,
    packageJsonDepsRequired,
    packageNameToFilesToMove,
    primaryPackages,
    relativeFileInfoMap,
  }: SetupResults
): JobArgs {
  return {
    packageJsonDepsRequired: packageName === args.destination ? packageJsonDepsRequired : undefined,
    relativeFileInfoMap:
      packageName === args.destination
        ? relativeFileInfoMap
        : new Map<FilePath, RelativeFileInfo>(),
    packageExportRenamesMap,
    filesToRemove: packageNameToFilesToMove.get(packageName),
    destination: args.destination,
    primaryPackages,
    shouldOrganizeImports: args.organizeImports,
  };
}

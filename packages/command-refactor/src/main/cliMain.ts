import { createWorkspaceFromDisk, type JobSpec } from "@eartool/batch";
import { maybeLoadProject, type PackageJson, type FilePath } from "@eartool/utils";
import * as path from "node:path";
import type { Logger } from "pino";
import { setupOverall, type RelativeFileInfo } from "./setupOverall.js";
import * as fs from "node:fs";
import type { JobArgs } from "../shared/JobArgs.js";

export async function cliMain(
  args: { destination: string; files: string[] } & {
    [argName: string]: unknown;
    _: (string | number)[];
    $0: string;
  } & {
    readonly workspace: string;
    readonly from: string[];
    readonly downstream: boolean;
    readonly progress: boolean;
    readonly "dry-run": boolean;
    readonly dryRun: boolean;
    readonly verbose: number;
  } & { logger: Logger }
): Promise<JobSpec<JobArgs, {}>> {
  const workspace = await createWorkspaceFromDisk(args.workspace);
  const {
    direction,
    packageExportRenamesMap,
    packageJsonDepsRequired,
    packageNameToFilesToMove,
    primaryPackages,
    relativeFileInfoMap,
  } = await setupOverall(
    workspace,
    maybeLoadProject,
    new Set(args.files),
    args.destination,
    args.logger
  );

  // Delete old files and create new ones before running the job
  return {
    workerUrl: new URL(import.meta.url),
    getJobArgs({ packageName }): JobArgs {
      return {
        packageJsonDepsRequired:
          packageName === args.destination ? packageJsonDepsRequired : undefined,
        relativeFileInfoMap:
          packageName === args.destination
            ? relativeFileInfoMap
            : new Map<FilePath, RelativeFileInfo>(),
        packageExportRenamesMap,
        filesToRemove: packageNameToFilesToMove.get(packageName),
        destination: args.destination,
        primaryPackages,
        shouldOrganizeImports: false, // fixme
      };
    },
    skipJobAndReturnResult(jobInfo) {
      if (primaryPackages.has(jobInfo.packageName)) return undefined;

      const packageJson: PackageJson = JSON.parse(
        fs.readFileSync(path.join(jobInfo.packagePath, "package.json"), "utf-8")
      );

      const depNames = [
        ...Object.keys(packageJson.dependencies ?? {}),
        ...Object.keys(packageJson.devDependencies ?? {}),
      ];
      if (depNames.some((a) => primaryPackages.has(a))) {
        return undefined;
      }

      // SKIP
      return {};
    },
    onComplete() {
      //
    },
  };
}

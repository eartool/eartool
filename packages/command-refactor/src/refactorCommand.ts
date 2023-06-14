/* eslint-disable @typescript-eslint/consistent-type-imports */
import { makeBatchCommand } from "@eartool/batch";
import { createWorkspaceFromDisk, type JobSpec } from "@eartool/batch";
import { maybeLoadProject, type PackageJson } from "@eartool/utils";
import * as path from "node:path";
import type { Logger } from "pino";
import * as fs from "node:fs";
import { setupOverall } from "./main/setupOverall.js";
import type { JobArgs } from "./shared/JobArgs.js";
import { getJobArgs } from "./main/getJobArgs.js";

/*
There are a lot of scenarios I want to be able to do easily.

Suppose we have a package graph like so:
  cool-app -> [cool-app-api, cool-app-redux]
  cool-app-redux -> cool-app-api
  cool-app-api -> cool-app-base

We may want to:
  - Pull code UP from cool-app to cool-app-api
  - Pull code DOWN from cool-app-base to cool-app-redux
  - Or maybe even some mix

  // All this wording is broken

Concrete Example: PUSH DOWN stream
  - cool-app-redux/src/foo.ts to cool-app
  - cool-app-redux/src/moo.ts has a dependency in package on ./foo.ts
  - cool-app-redux/src/foo.ts has a dependency in package on ./bar.ts
  - We can either also pull bar.ts up OR we can make sure its values are exported
  - We MUST push down ./moo.ts up also
  - If ./index.ts re-exports the contents, then we need to update all downstream to
    ensure they also depend on cool-app and re-export from there too!

Concrete Example: PULL UP stream
  - cool-app-redux/src/foo.ts to cool-app-api
  - cool-app-redux/src/moo.ts has a dependency in package on ./foo.ts
  - cool-app-redux/src/foo.ts has a dependency in package on ./bar.ts
  - We would be required to also push ./bar.ts up. 
  - If ./index.ts re-exports, then we need to update all upstream to
    ensure they also depend on cool-app-api and reexport

Concrete Example: MOVE SIDEWAYS
  - cool-app-redux/src/foo.ts to cool-app-other (which is sideways)
  - cool-app-redux/src/moo.ts has a dependency in package on ./foo.ts
  - cool-app-redux/src/foo.ts has a dependency in package on ./bar.ts
  - We can make `cool-app-other` depend on `cool-app-redux` and ensure we export from ./bar.ts
    OR we could push over ./bar.ts. 
  - If ./index.ts re-exports, then we need to update all upstream to
    ensure they also depend on cool-app-other


Rough API idea: 
  - Multiple sets of { move: [file/path.ts, file/path2.ts], toPackage: "cool-app-redux"}
    1. Discover package for each file
    1. Determine if we are pulling UP/DOWN or sideways
    2. Per package, in dependency order:
      1. Evaluate all exports from file sets in project, finding local usages within their own packages
      2. Determine if we need to move additional files
      3. We need to check if the new location will conflict on file name or export name!
      3. Build a list of `write new file here/delete there` and run
      4. Build a list of `if you imported from X then you need to import from Y` and run on whole world?
        naive is whole world but we can problably be smart depending on direction

Frameowkr right now doesn't let me iterate over the package set twice... so we can produce subsequent task files?
*/

export const refactorCommand = makeBatchCommand(
  {
    name: "refactor",
    description: "refactor description",
    options: {
      destination: {
        description: "The package name to end on",
        string: true,
        demandOption: true,
      },
      files: {
        array: true,
        normalize: true,
        demandOption: true,
      },
    },
    cliMain: async (args) => {
      return await cliMain(args);
    },
  },
  () => import("./worker/workerMain.js")
);

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
  const setupResults = await setupOverall(
    workspace,
    maybeLoadProject,
    new Set(args.files),
    args.destination,
    args.logger
  );

  // Delete old files and create new ones before running the job
  return {
    workerUrl: new URL(import.meta.url), // FIXME get this as an arg to makeBatchCommand so this func can move
    getJobArgs({ packageName }): JobArgs {
      const jobArgs = getJobArgs(packageName, args, setupResults);
      return jobArgs;
    },
    skipJobAndReturnResult(jobInfo) {
      if (setupResults.primaryPackages.has(jobInfo.packageName)) return undefined;

      const packageJson: PackageJson = JSON.parse(
        fs.readFileSync(path.join(jobInfo.packagePath, "package.json"), "utf-8")
      );

      const depNames = [
        ...Object.keys(packageJson.dependencies ?? {}),
        ...Object.keys(packageJson.devDependencies ?? {}),
      ];
      if (depNames.some((a) => setupResults.primaryPackages.has(a))) {
        return undefined;
      }

      // SKIP
      return {};
    },
    onComplete() {
      //
    },
    order: "any",
  };
}

/* eslint-disable @typescript-eslint/consistent-type-imports */
import { createWorkspaceFromDisk, makeBatchCommand } from "@eartool/batch";
import {
  addSingleFileReplacementsForRenames,
  processReplacements,
  SimpleReplacements,
  type PackageExportRename,
} from "@eartool/replacements";
import {
  dropDtsFiles,
  maybeLoadProject,
  organizeImportsOnFiles,
  type PackageName,
} from "@eartool/utils";
import * as path from "node:path";
import type { Logger } from "pino";
import type { Project } from "ts-morph";
import { removeFilesIfInProject } from "./removeFilesIfInProject.js";
import { setupOverall } from "./setupOverall.js";

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
      const { fileContents, rootExportsToMove } = await setupOverall(
        await createWorkspaceFromDisk(args.workspace),
        maybeLoadProject,
        new Set(args.files),
        args.destination,
        args.logger
      );

      // Delete old files and create new ones before running the job

      return {
        workerUrl: new URL(import.meta.url),
        getJobArgs({ packageName }) {
          return {
            filesToAdd: packageName === args.destination ? fileContents : new Map<string, string>(),
            rootExportsToMove,
            filesToMove: args.files,
            destination: args.destination,
            shouldOrganizeImports: false, // fixme
          };
        },
        onComplete() {
          // extra.logger.info(extra.result);
        },
      };
    },
  },
  async () => {
    return {
      default: async ({
        packagePath,
        logger,
        dryRun,
        jobArgs: { filesToAdd, filesToMove, rootExportsToMove, shouldOrganizeImports },
      }) => {
        const project = maybeLoadProject(packagePath);
        if (!project) {
          return;
        }

        dropDtsFiles(project);

        const changedFiles = await doTheWork(
          filesToMove,
          project,
          filesToAdd,
          packagePath,
          logger,
          rootExportsToMove
        );

        if (shouldOrganizeImports) {
          logger.debug("Organizing imports");
          organizeImportsOnFiles(project, changedFiles);
        }

        if (dryRun) {
          logger.trace("DRY RUN");
        } else {
          logger.info("Saving");
          await project.save();
        }
      },
    };
  }
);

async function doTheWork(
  filesToMove: string[],
  project: Project,
  filesToAdd: Map<string, string>,
  packagePath: string,
  logger: Logger,
  rootExportsToMove: Map<PackageName, PackageExportRename[]>
) {
  removeFilesIfInProject(filesToMove, project);

  for (const [relPath, contents] of filesToAdd) {
    project.createSourceFile(path.resolve(packagePath, relPath), contents);
  }

  const replacements = new SimpleReplacements(logger);

  for (const sf of project.getSourceFiles()) {
    addSingleFileReplacementsForRenames(sf, rootExportsToMove, replacements);
  }

  // actually updates files in project!
  return [...processReplacements(project, replacements.getReplacementsMap())];
}

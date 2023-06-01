import type * as yargs from "yargs";
import { createStore } from "./createStore.js";
import { selectAdditionalRenames, workCompleted } from "./workResults.js";
import * as path from "node:path";
import { runBatchJob } from "@eartool/batch";
import type { FixWorkspaceJob } from "../shared/FixWorkspaceJob.js";

const standardBatchYargsOptions = {
  workspace: {
    alias: ["w"],
    string: true,
    describe: "The workspace to run against",
    demandOption: true,
  },
  from: {
    describe: "",
    array: true,
    string: true,
    default: [] as string[],
    defaultDescription: "All packages",
  },
  downstream: {
    type: "boolean",
    default: true,
  },
  progress: {
    type: "boolean",
    default: true,
  },
  "dry-run": {
    describe: "Whether to run without saving changes",
    type: "boolean",
    default: false,
  },
} as const satisfies { [key: string]: yargs.Options };

const options = {
  ...standardBatchYargsOptions,

  namespaces: {
    type: "boolean",
    default: true,
  },
  "faux-namespaces": {
    type: "boolean",
    default: true,
  },

  "organize-imports": {
    describe: "Whether or not to organise imports",
    type: "boolean",
    default: true,
  },
} as const satisfies { [key: string]: yargs.Options };

export default function registerCommand(yargs: yargs.Argv<NonNullable<unknown>>) {
  return yargs.command(
    "fix-namespaces",
    "Removes real and faux namespaces from the codebase",
    (yargs) => yargs.options(options).strict(),
    async (args) => {
      const {
        workspace: workspaceDir,
        from: startPackageNames,
        dryRun,
        namespaces: removeNamespaces,
        fauxNamespaces: removeFauxNamespaces,
        downstream: fixDownstream,
        organizeImports,
        progress,
      } = args;

      const { store } = createStore();

      const common = {
        workspaceDir,
        startPackageNames,
        dryRun,
        logDir: path.join(workspaceDir, ".log"),
        progress,
      };

      await runBatchJob<FixWorkspaceJob>(common, {
        workerUrl: new URL("../worker/workerMain.js", import.meta.url),
        skipJobAndReturnResult: (a) => {
          if (!fixDownstream && !a.isInStartGroup) {
            return [];
          }
          return undefined;
        },
        getJobArgs: ({ isInStartGroup }) => {
          return {
            removeNamespaces: removeNamespaces && isInStartGroup,
            removeFauxNamespaces: removeFauxNamespaces && isInStartGroup,
            organizeImports: organizeImports,
            fixDownstream: fixDownstream,
            additionalRenames: fixDownstream
              ? selectAdditionalRenames(store.getState())
              : new Map(),
          };
        },
        onComplete: ({ packageName }, exportedRenames) => {
          store.dispatch(workCompleted({ exportedRenames, packageName }));
        },
      });
    }
  );
}

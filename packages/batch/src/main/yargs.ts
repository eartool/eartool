import * as path from "node:path";
import type { MessagePort } from "node:worker_threads";
import { isMainThread, workerData } from "node:worker_threads";
import type * as yargs from "yargs";
import type { JobDef } from "../shared/JobDef.js";
import { setupWorker, type WorkerData } from "../worker/setupWorker.js";
import { runBatchJob, type BatchJobOptions, type JobSpec } from "./runBatchJob.js";

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

type StandardBatchOptionTypes = yargs.InferredOptionTypes<typeof standardBatchYargsOptions>;
type StandardBatchArgs = yargs.ArgumentsCamelCase<StandardBatchOptionTypes>;

function getBatchJobOptionsFromYargs(args: StandardBatchArgs): BatchJobOptions {
  const { workspace: workspaceDir, from: startPackageNames, dryRun, progress } = args;

  return {
    workspaceDir,
    startPackageNames,
    dryRun,
    logDir: path.join(workspaceDir, ".log"),
    progress,
  };
}

export function makeBatchCommand<O extends { [key: string]: yargs.Options }, W, R>(
  {
    name,
    description,
    options,
    cliMain,
  }: {
    name: string;
    description: string;
    options: O;
    cliMain: (
      args: yargs.ArgumentsCamelCase<yargs.InferredOptionTypes<O>> & StandardBatchArgs
    ) => Promise<JobSpec<W, R>>;
  },
  workerMain: () => Promise<{
    default: (workerArgs: WorkerData<W>, port: MessagePort) => Promise<R>;
  }>
) {
  if (isMainThread) {
    return (yargs: yargs.Argv<NonNullable<unknown>>) =>
      yargs.command(
        name,
        description,
        (yargs) => yargs.options({ ...standardBatchYargsOptions, ...options }).strict(),
        async (args) => {
          const q = await cliMain(args as any);

          await runBatchJob<JobDef<W, R>>(getBatchJobOptionsFromYargs(args), {
            ...q,
            getJobArgs(info) {
              return {
                ...q.getJobArgs(info),
                __specialCommandCheck: name,
              };
            },
          });
        }
      );
  } else {
    if (workerData.jobArgs.__specialCommandCheck === name) {
      workerMain().then((a) => setupWorker(a.default));
      // setupWorker((await workerMain()).default);
    }
  }
}

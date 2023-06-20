import { isMainThread, workerData } from "node:worker_threads";
import type { MessagePort } from "node:worker_threads";
import * as path from "node:path";
import type { Logger } from "pino";
import type * as yargs from "yargs";
import { findWorkspaceDir } from "@pnpm/find-workspace-dir";
import type { JobDef } from "../shared/JobDef.js";
import { setupWorker, type WorkerData } from "../worker/setupWorker.js";
import { createLogger } from "../shared/createLogger.js";
import { runBatchJob, type BatchJobOptions, type JobSpec } from "./runBatchJob.js";
import * as os from "node:os";

const standardBatchYargsOptions = {
  workspace: {
    alias: ["w"],
    string: true,
    describe: "The workspace to run against",
    defaultDescription: "Will walk up from the current directory",
    default: ".",
    normalize: true,
    coerce: async (value: string) => {
      const maybe = await findWorkspaceDir(value);
      if (!maybe) throw new Error(`Unable to identify a workspace from ${value}`);
      return maybe;
    },
  },
  // TODO move this out, it also doesnt always make sense
  from: {
    describe: "",
    array: true,
    string: true,
    default: [] as string[],
    defaultDescription: "All packages",
  },
  // TODO move this out, it doesnt always make sense.
  downstream: {
    type: "boolean",
    default: true,
  },
  // TODO not all comamnds need this/support it
  progress: {
    type: "boolean",
    default: true,
  },
  // Same
  "dry-run": {
    describe: "Whether to run without saving changes",
    type: "boolean",
    default: false,
  },
  verbose: {
    alias: "v",
    boolean: true,
    count: true,
  },
  workers: {
    alias: "p",
    number: true,
    default: os.cpus().length,
  },
} as const satisfies { [key: string]: yargs.Options };

type StandardBatchOptionTypes = yargs.InferredOptionTypes<typeof standardBatchYargsOptions>;
type StandardBatchArgs = yargs.ArgumentsCamelCase<StandardBatchOptionTypes>;

async function getBatchJobOptionsFromYargs(args: StandardBatchArgs): Promise<BatchJobOptions> {
  const { from: startPackageNames, dryRun, progress, workers } = args;
  const workspaceDir = await args.workspace;

  return {
    workers,
    workspaceDir,
    startPackageNames,
    dryRun,
    logDir: path.join(workspaceDir, ".log"),
    progress,
  };
}

export function makeBatchCommand<O extends { [key: string]: yargs.Options }, W, R extends {}>(
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
      args: yargs.ArgumentsCamelCase<yargs.InferredOptionTypes<O>> &
        StandardBatchArgs & { logger: Logger }
    ) => Promise<Omit<JobSpec<W, R>, "runInlineFunc">>;
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
          const batchJobOpts = await getBatchJobOptionsFromYargs(args);

          const consoleLevel = args.progress
            ? "silent"
            : args.verbose >= 2
            ? "trace"
            : args.verbose >= 1
            ? "debug"
            : "info";

          const logger = createLogger(path.join(batchJobOpts.logDir, "main"), {
            level: "trace",
            consoleLevel,
          });
          logger.info("Console log level set to: " + consoleLevel);

          const q = await cliMain({ ...args, logger } as any);

          await runBatchJob<JobDef<W, R>>(await getBatchJobOptionsFromYargs(args), logger, {
            ...q,
            runInlineFunc: async () => (await workerMain()).default,
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

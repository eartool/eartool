import { isMainThread, workerData } from "node:worker_threads";
import type { MessagePort } from "node:worker_threads";
import * as path from "node:path";
import * as os from "node:os";
import type { Logger } from "pino";
import type * as yargs from "yargs";
import { findWorkspaceDir } from "@pnpm/find-workspace-dir";
import { createLogger } from "@eartool/utils";
import type { JobDef } from "../shared/JobDef.js";
import { setupWorker, type WireWorkerData, type WorkerData } from "../worker/setupWorker.js";
import { runBatchJob, type BatchJobOptions, type JobSpec } from "./runBatchJob.js";

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
    hidden: true,
  },
  // TODO not all comamnds need this/support it
  progress: {
    type: "boolean",
    default: false,
  },
  // Same
  "dry-run": {
    alias: "n",
    describe: "Whether to run without saving changes",
    type: "boolean",
    default: false,
  },
  verbose: {
    alias: "v",
    boolean: true,
    count: true,
  },
  "organize-imports": {
    describe: "Whether or not to organise imports",
    type: "boolean",
    default: false,
  },
  workers: {
    number: true,
    default: os.cpus().length,
    defaultDescription: `Number of CPUs (${os.cpus().length})`,
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

export type BatchCommand<O extends { [key: string]: yargs.Options }, W, R extends {}> =
  | ((yargs: yargs.Argv<{}>) => yargs.Argv<{}>)
  | undefined;

export type CliMainArgs<O extends { [key: string]: yargs.Options }> = yargs.ArgumentsCamelCase<
  yargs.InferredOptionTypes<O>
> &
  StandardBatchArgs & { logger: Logger };

export type CliMainResult<W, R> = Promise<Omit<JobSpec<W, R>, "runInlineFunc">>;

export function makeBatchCommand<O extends { [key: string]: yargs.Options }, W, R extends {}>(
  {
    name,
    description,
    example,
    options,
    cliMain,
  }: {
    name: string;
    description: string | false;
    example?: [string, string];
    options: O;
    cliMain: (args: CliMainArgs<O>) => CliMainResult<W, R>;
  },
  loadWorkerMain: () => Promise<{
    default: (workerArgs: WorkerData<W>, port: MessagePort) => Promise<R>;
  }>,
): BatchCommand<O, W, R> {
  if (isMainThread) {
    return (yargs: yargs.Argv<NonNullable<unknown>>) =>
      yargs.command(
        name,
        description as string, // if this arg is false its hidden but we cant type it correctly :(
        (yargs) => {
          let ret = yargs.options({ ...standardBatchYargsOptions, ...options }).strict();
          if (example) ret = ret.example(...example);

          return ret as yargs.Argv<StandardBatchOptionTypes & yargs.InferredOptionTypes<O>>;
        },
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

          // eslint-disable-next-line no-console
          console.profile(`${process.pid} --- cliMain()`);
          const q = await cliMain({ ...args, logger } as any);
          // eslint-disable-next-line no-console
          console.profileEnd();

          await runBatchJob<JobDef<W, R>>(await getBatchJobOptionsFromYargs(args), logger, {
            ...q,
            runInlineFunc: async () => (await loadWorkerMain()).default,
            getJobArgs(info) {
              return {
                ...q.getJobArgs(info),
                __specialCommandCheck: name,
                __parentIdentifier: process.pid.toString(),
              };
            },
          });
        },
      );
  } else {
    const wireWorkerData = workerData as WireWorkerData<{
      __specialCommandCheck: string;
      __parentIdentifier: string;
    }>;

    if (wireWorkerData.jobArgs.__specialCommandCheck === name) {
      loadWorkerMain().then((a) =>
        setupWorker(
          a.default,
          wireWorkerData.jobArgs.__parentIdentifier,
          wireWorkerData.packageName,
        ),
      );
      // setupWorker((await workerMain()).default);
    }
  }
}

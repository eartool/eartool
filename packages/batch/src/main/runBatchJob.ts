import { Worker } from "node:worker_threads";
import * as path from "node:path";
import type { Level, Logger } from "pino";
import * as MessagesToMain from "../shared/MessagesToMain.js";
import { type WireWorkerData, type WorkerFunc } from "../worker/setupWorker.js";
import { runWorker } from "../worker/runWorker.js";
import type { JobDef } from "../shared/JobDef.js";
import { createWorkspaceFromDisk } from "./createWorkspaceFromDisk.js";
import type { Progress } from "./progress/Progress.js";
import { NoopProgress } from "./progress/NoopProgress.js";
import { RealProgress } from "./progress/RealProgress.js";

export interface JobInfo {
  packageName: string;
  packagePath: string;
  isInStartGroup: boolean;
  workspaceDir: string;
}

export interface JobSpec<T, R> {
  workerUrl: URL;
  runInlineFunc: () => Promise<WorkerFunc<JobDef<T, R>>>;
  getJobArgs: (info: JobInfo) => T | Promise<T>;
  onComplete?: (jobInfo: JobInfo, extra: { logger: Logger; result: R }) => void | Promise<void>;
  skipJobAndReturnResult?: (jobInfo: JobInfo) => R | undefined | Promise<R | undefined>;
  order: "any" | "upstreamFirst";
}

export interface BatchJobOptions {
  workspaceDir: string;
  startPackageNames: string[]; // todo support glob?
  logDir: string;
  dryRun: boolean;
  progress: boolean;
  workers: number;
}

export async function runBatchJob<Q extends JobDef<unknown, unknown>>(
  opts: BatchJobOptions,
  logger: Logger,
  jobSpec: JobSpec<Q["__ArgsType"], Q["__ResultType"]>
) {
  const progress: Progress = opts.progress ? new RealProgress() : new NoopProgress();

  const { workspaceDir } = opts;
  // we have at least 11 under a normal run on my mac. it doesn't grow, we arent leaking
  process.setMaxListeners(20);

  const workspace = await createWorkspaceFromDisk(workspaceDir);
  const startNodeLookups = opts.startPackageNames.map((name) => ({ name }));
  const downStreamProjects = [...workspace.walkTreeDownstreamFrom(...startNodeLookups)];

  progress.setProjectCount(downStreamProjects.length);

  await workspace.runTasks(
    startNodeLookups,
    jobSpec.order,
    opts.workers,
    async ({ packageName, packagePath }) => {
      const isInStartGroup =
        startNodeLookups.length === 0 || startNodeLookups.some((a) => a.name === packageName);
      const jobInfo: JobInfo = { packageName, packagePath, isInStartGroup, workspaceDir };

      progress.addProject(packageName);

      const maybeSkipWithResult = await jobSpec.skipJobAndReturnResult?.(jobInfo);
      if (maybeSkipWithResult) {
        logger.trace("Skipping with result for %s", packageName);
      }

      try {
        const result = maybeSkipWithResult ?? (await runInWorker(jobInfo));

        if (jobSpec.onComplete) {
          logger.trace("Calling onComplete for %s %o", packageName);
          await jobSpec.onComplete(jobInfo, { logger, result });
        }

        progress.completeProject(packageName);
        logger.trace("Done with %s", packageName);
      } catch (err) {
        logger.flush();
        throw new AggregateError(
          [err],
          `Failed while trying to run job for ${jobInfo.packagePath}`
        );
      }
    }
  );

  progress.stop();

  async function runInWorker(jobInfo: Readonly<JobInfo>) {
    const { packageName, packagePath, workspaceDir } = jobInfo;
    const workerData: WireWorkerData<Q["__ArgsType"]> = {
      logDir: path.join(opts.logDir, "per-package", packageName),
      packageName,
      workspaceDir,
      packagePath,
      dryRun: opts.dryRun,
      jobArgs: await jobSpec.getJobArgs(jobInfo),
    };

    logger.debug("Forking worker for %s", packageName);

    const { port1: myPort, port2: theirPort } = new MessageChannel();
    const result = new Promise<Q["__ResultType"]>((resolve, reject) => {
      myPort.addListener("message", (message) => {
        if (MessagesToMain.log.match(message)) {
          const { level, msg, ...remaining } = message.payload;
          logger.levels.labels[message.payload.level];
          logger[logger.levels.labels[level] as Level](
            { ...remaining, packageName: jobInfo.packageName },
            msg
          );

          return;
        }
        if (MessagesToMain.updateStatus.match(message)) {
          progress.updateProject(
            jobInfo.packageName,
            message.payload.completedWorkUnits,
            message.payload.totalWorkUnits,
            message.payload.stage
          );
        } else if (MessagesToMain.workComplete.match(message)) {
          logger.trace("Recieved workComplete form worker %s, %o", packagePath, message.payload);

          if (message.payload.status == "success") {
            resolve(message.payload.result);
          } else {
            logger.fatal(message.payload.error);
            reject(message.payload.error);
          }
          return;
        } else {
          // UNKNOWN MESSAGE!!
          throw new Error("Unknown message: " + JSON.stringify(message));
        }
      });
    });

    if (opts.workers == 1) {
      const f = await jobSpec.runInlineFunc();
      runWorker(theirPort, f, workerData);
    } else {
      const worker = new Worker(jobSpec.workerUrl, { workerData });
      worker.postMessage({ port: theirPort }, [theirPort]);
    }

    return result;
  }
}

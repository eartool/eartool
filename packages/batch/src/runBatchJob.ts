import type { SingleBar } from "cli-progress";
import { MultiBar, Presets } from "cli-progress";
import { createWorkspaceInfo } from "./WorkspaceInfo.js";
import * as path from "node:path";
import { createLogger } from "./createLogger.js";
import { Worker } from "node:worker_threads";
import * as MessagesToMain from "./MessagesToMain.js";
import type { JobDef, WireWorkerData } from "./setupWorker.js";

interface JobInfo {
  packageName: string;
  packagePath: string;
  isInStartGroup: boolean;
}

interface JobSpec<T, R> {
  workerUrl: URL;
  getJobArgs: (info: JobInfo) => T | Promise<T>;
  onComplete?: (jobInfo: JobInfo, result: R) => void | Promise<void>;
  skipJobAndReturnResult?: (jobInfo: JobInfo) => R | undefined | Promise<R | undefined>;
}

export async function runBatchJob<Q extends JobDef<unknown, unknown>>(
  opts: {
    workspaceDir: string;
    startPackageNames: string[]; // todo support glob?
    logDir: string;
    dryRun: boolean;
    progress: boolean;
  },
  jobSpec: JobSpec<Q["__ArgsType"], Q["__ResultType"]>
) {
  const { workspaceDir } = opts;
  // we have at least 11 under a normal run on my mac. it doesn't grow, we arent leaking
  process.setMaxListeners(20);

  const logger = createLogger(path.join(opts.logDir, "main"), "trace");
  logger.trace("Creating workspace object");

  const multibar = new MultiBar(
    { format: " {bar} | {name} | {percentage}% {stage} | {eta_formatted}", fps: 2 },
    Presets.rect
  );
  const topBar = multibar.create(100, 0, {
    name: "total package progress",
    stage: "",
  });

  const workspace = await createWorkspaceInfo(workspaceDir);
  const startNodeLookups = opts.startPackageNames.map((name) => ({ name }));
  const downStreamProjects = [...workspace.walkTreeDownstreamFrom(...startNodeLookups)];

  topBar.setTotal(downStreamProjects.length);

  await workspace.runTasksInOrder(startNodeLookups, async ({ packageName, packagePath }) => {
    const isInStartGroup =
      startNodeLookups.length === 0 || startNodeLookups.some((a) => a.name === packageName);
    const jobInfo = { packageName, packagePath, isInStartGroup } as const;

    const bar = multibar.create(100, 0, {
      name: packageName,
      stage: "initializing",
    });

    const maybeSkipWithResult = await jobSpec.skipJobAndReturnResult?.(jobInfo);
    if (maybeSkipWithResult) {
      logger.debug("Skipping with result for %s", packageName);
    }

    const result = maybeSkipWithResult ?? (await runInWorker(jobInfo, bar));

    if (jobSpec.onComplete) {
      logger.debug("Calling onComplete for %s %o", packageName);
      await jobSpec.onComplete(jobInfo, result);
    }

    multibar.remove(bar);
    topBar.increment();
    logger.trace("Done with %s", packageName);
  });

  multibar.stop();

  async function runInWorker(jobInfo: Readonly<JobInfo>, bar: SingleBar) {
    const { packageName, packagePath } = jobInfo;
    const workerData: WireWorkerData<Q["__ArgsType"]> = {
      logDir: path.join(opts.logDir, "per-package", packageName),
      packageName,
      packagePath,
      dryRun: opts.dryRun,
      jobArgs: await jobSpec.getJobArgs(jobInfo),
    };

    logger.trace("Forking worker for %s", packagePath);
    const worker = new Worker(jobSpec.workerUrl, { workerData });

    const { port1: myPort, port2: theirPort } = new MessageChannel();
    const result = new Promise<Q["__ResultType"]>((resolve) => {
      myPort.addListener("message", (message) => {
        if (MessagesToMain.updateStatus.match(message)) {
          bar.setTotal(message.payload.totalWorkUnits);
          bar.update(message.payload.completedWorkUnits, { stage: message.payload.stage });
        } else if (MessagesToMain.workComplete.match(message)) {
          logger.trace("Recieved workComplete form worker %s, %o", packagePath, message.payload);

          resolve(message.payload);
          return;
        } else {
          // UNKNOWN MESSAGE!!
          throw new Error("Unknown message: " + JSON.stringify(message));
        }
      });
    });

    worker.postMessage({ port: theirPort }, [theirPort]);
    return result;
  }
}

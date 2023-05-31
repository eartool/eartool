import { ok } from "node:assert";
import { MessagePort, parentPort, workerData } from "node:worker_threads";
import type { Logger } from "pino";
import { createLogger } from "./createLogger.js";
import type { Status } from "./MessagesToMain.js";
import * as MessagesToMain from "./MessagesToMain.js";

export interface BaseWorkerData<T> {
  jobArgs: T;
  packageName: string;
  packagePath: string;
  dryRun: boolean;
}

export interface WireWorkerData<T> extends BaseWorkerData<T> {
  logDir: string;
}

export interface WorkerData<T> extends BaseWorkerData<T> {
  logger: Logger;
  updateStatus: (status: Status) => void;
}

export interface JobDef<Args, Result> {
  __ArgsType: Args;
  __ResultType: Result;
}

export function setupWorker<Q extends JobDef<any, any>>(
  worker: (data: WorkerData<Q["__ArgsType"]>, port: MessagePort) => Promise<Q["__ResultType"]>
) {
  parentPort?.once("message", async (value: { port: MessagePort }) => {
    ok(value != null);
    ok("port" in value);
    ok(value.port instanceof MessagePort);

    const { port } = value;
    const { logDir, ...jobData }: WireWorkerData<any> = workerData;

    const logger = createLogger(logDir, "trace");

    const result = await worker(
      {
        ...jobData,
        logger,
        updateStatus: (status: Status) => {
          port.postMessage(MessagesToMain.updateStatus(status));
        },
      },
      value.port
    );

    port.postMessage(MessagesToMain.workComplete(result));
  });
}

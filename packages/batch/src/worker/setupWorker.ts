import { ok } from "node:assert";
import { MessagePort, parentPort, workerData } from "node:worker_threads";
import type { Logger } from "pino";
import { createLogger } from "../shared/createLogger.js";
import type { Status } from "../shared/MessagesToMain.js";
import * as MessagesToMain from "../shared/MessagesToMain.js";
import type { JobDef } from "../shared/JobDef.js";
import abstractTransport from "pino-abstract-transport";

export interface BaseWorkerData<T> {
  jobArgs: T;
  packageName: string;
  packagePath: string;
  dryRun: boolean;
  workspaceDir: string;
}

export interface WireWorkerData<T> extends BaseWorkerData<T> {
  logDir: string;
}

export interface WorkerData<T> extends BaseWorkerData<T> {
  logger: Logger;
  updateStatus: (status: Status) => void;
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

    const realAbstractTransport =
      abstractTransport as unknown as (typeof abstractTransport)["default"];

    const customTransport = realAbstractTransport(async function (source) {
      for await (const chunk of source) {
        port.postMessage(MessagesToMain.log(chunk));
      }
    });

    const logger = createLogger(logDir, { level: "trace", extraStreams: [customTransport] });

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

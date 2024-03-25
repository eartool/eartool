import { MessagePort, parentPort, workerData } from "node:worker_threads";
import { ok } from "node:assert";
import type { Logger } from "pino";
import type { Status } from "../shared/MessagesToMain.js";
import type { JobDef } from "../shared/JobDef.js";
import { runWorker } from "./runWorker.js";

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

export type WorkerFunc<Q extends JobDef<any, any>> = (
  data: WorkerData<Q["__ArgsType"]>,
  port: MessagePort,
) => Promise<Q["__ResultType"]>;

export function setupWorker<Q extends JobDef<any, any>>(
  worker: WorkerFunc<Q>,
  parentProcessIdentifier: string,
  packageName: string,
) {
  parentPort?.once("message", async (value: { port: MessagePort }) => {
    ok(value != null);
    ok("port" in value);
    ok(value.port instanceof MessagePort);

    const { port } = value;
    // eslint-disable-next-line no-console
    console.profile(`${parentProcessIdentifier}-${packageName}`);
    await runWorker<Q>(port, worker, workerData);
    // eslint-disable-next-line no-console
    console.profileEnd();
  });
}

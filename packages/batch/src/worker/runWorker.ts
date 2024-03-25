import type { MessagePort } from "node:worker_threads";
import abstractTransport from "pino-abstract-transport";
import { createLogger } from "@eartool/utils";
import type { Status } from "../shared/MessagesToMain.js";
import * as MessagesToMain from "../shared/MessagesToMain.js";
import type { JobDef } from "../shared/JobDef.js";
import { type WorkerFunc, type WireWorkerData } from "./setupWorker.js";

export async function runWorker<Q extends JobDef<any, any>>(
  port: MessagePort,
  worker: WorkerFunc<Q>,
  data: WireWorkerData<any>,
) {
  const { logDir, ...jobData }: WireWorkerData<any> = data;

  const logger = createMessagePortForwardingLogger(port, logDir);

  try {
    const result = await worker(
      {
        ...jobData,
        logger,
        updateStatus: (status: Status) => {
          port.postMessage(MessagesToMain.updateStatus(status));
        },
      },
      port,
    );
    port.postMessage(MessagesToMain.workComplete({ status: "success", result }));
  } catch (err) {
    port.postMessage(MessagesToMain.workComplete({ status: "failed", error: err }));
  }
}
function createMessagePortForwardingLogger(port: MessagePort, logDir: string) {
  const realAbstractTransport = abstractTransport; //as unknown as (typeof abstractTransport)["default"];

  const customTransport = realAbstractTransport(async function (source) {
    for await (const chunk of source) {
      port.postMessage(MessagesToMain.log(chunk));
    }
  });

  const logger = createLogger(logDir, { level: "trace", extraStreams: [customTransport] });
  return logger;
}

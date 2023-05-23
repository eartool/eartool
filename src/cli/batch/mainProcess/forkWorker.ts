import { Worker, MessageChannel } from "node:worker_threads";
import type { Dispatch } from "@reduxjs/toolkit";
import type { WorkerData } from "../shared/messages/WorkerData.js";

export function forkWorker(action: WorkerData, dispatch: Dispatch) {
  const worker = new Worker(new URL("../worker/batchWorker.js", import.meta.url), {
    workerData: {
      ...action,
    },
  });
  const { port1: myPort, port2: theirPort } = new MessageChannel();

  myPort.addListener("message", (message) => {
    dispatch(message);
  });

  worker.postMessage({ port: theirPort }, [theirPort]);

  return myPort;
}

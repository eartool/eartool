import { ok } from "assert";
import { MessagePort, parentPort, workerData } from "node:worker_threads";
import { workerMain } from "./workerMain.js";

parentPort?.once("message", (value: { port: MessagePort }) => {
  ok(value != null);
  ok("port" in value);
  ok(value.port instanceof MessagePort);

  workerMain(value.port, workerData);
});

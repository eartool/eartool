import { MessagePort, parentPort, workerData } from "node:worker_threads";
import { ok } from "assert";
import { MessagesToMain, type WorkerData } from "../shared/messages/index.js";
import { processPackage } from "../../../processPackage.js";
import { createConsoleLogger } from "../../../utils/createConsoleLogger.js";

parentPort?.once("message", (value: { port: MessagePort }) => {
  ok(value != null);
  ok("port" in value);
  ok(value.port instanceof MessagePort);

  startWorker(value.port, workerData);
});

function startWorker(port: MessagePort, workerData: WorkerData) {
  const logger = createConsoleLogger("trace"); // TODO FIX THIS SO I CAN SEE in fiels

  try {
    processPackage(workerData.packagePath, {
      logger,
      dryRun: true,
      updateState: (data) => {
        console.log(data);
        port.postMessage(
          MessagesToMain.UpdateStatus({
            filesComplete: data.processedFiles,
            totalFiles: data.totalFiles,
            stage: "analyzing",
          })
        );
      },
    });
    // port.postMessage(
    //   MessagesToMain.UpdateStatus({ filesComplete: 3, totalFiles: 5, stage: "analyzing" })
    // );
  } finally {
    logger.flush();
  }
}

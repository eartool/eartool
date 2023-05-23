import type { MessagePort } from "node:worker_threads";
import { processPackage } from "../../../processPackage.js";
import { MessagesToMain, type WorkerData } from "../shared/messages/index.js";
import { createLogger } from "./createLogger.js";

export async function workerMain(
  port: MessagePort,
  { logDir, packageName, removeNamespaces, additionalRenames, packagePath }: WorkerData
) {
  const logger = createLogger(logDir, packageName, "trace"); // TODO FIX THIS SO I CAN SEE in fiels

  try {
    const result = await processPackage(packagePath, {
      logger,
      removeNamespaces,
      additionalRenames,
      updateState: (data) => {
        port.postMessage(MessagesToMain.updateStatus(data));
      },
    });

    port.postMessage(
      MessagesToMain.workComplete({
        exportedRenames: result.exportedRenames,
        packageName: packageName,
      })
    );
  } finally {
    logger.flush();
  }
}

import type { MessagePort } from "node:worker_threads";
import { processPackage } from "../../../processPackage.js";
import { MessagesToMain, type WorkerData } from "../shared/messages/index.js";
import { createLogger } from "./createLogger.js";

export async function workerMain(
  port: MessagePort,
  {
    logDir,
    packageName,
    removeNamespaces,
    additionalRenames,
    packagePath,
    dryRun,
    organizeImports,
    removeFauxNamespaces,
  }: WorkerData
) {
  const logger = createLogger(logDir, packageName, "trace");

  try {
    const result = await processPackage(packagePath, {
      logger,
      removeNamespaces,
      additionalRenames,
      dryRun,
      organizeImports,
      removeFauxNamespaces,
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

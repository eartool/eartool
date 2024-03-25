import type { MessagePort } from "node:worker_threads";
import type { WorkerData } from "@eartool/batch";
import type { PackageExportRename } from "@eartool/replacements";
import { processPackage } from "../../processPackage.js";
import type { WorkerArgs } from "../shared/WorkerArgs.js";

// setupWorker<FixWorkspaceJob>(workerMain());

export async function workerMain(
  { logger, packagePath, packageName, dryRun, updateStatus, jobArgs }: WorkerData<WorkerArgs>,
  _port: MessagePort,
): Promise<PackageExportRename[]> {
  try {
    const result = await processPackage(packageName, packagePath, {
      ...jobArgs,
      logger,
      dryRun,
      updateState: (data) => {
        updateStatus(data);
      },
    });

    return result.exportedRenames;
  } finally {
    logger.flush();
  }
}
export default workerMain;

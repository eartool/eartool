import { processPackage } from "../../processPackage.js";
import type { WorkerData } from "@eartool/batch";
import type { WorkerArgs } from "../shared/WorkerArgs.js";
import type { MessagePort } from "node:worker_threads";
import type { PackageExportRename } from "@eartool/replacements";

// setupWorker<FixWorkspaceJob>(workerMain());

export async function workerMain(
  { logger, packagePath, dryRun, updateStatus, jobArgs }: WorkerData<WorkerArgs>,
  _port: MessagePort
): Promise<PackageExportRename[]> {
  try {
    const result = await processPackage(packagePath, {
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
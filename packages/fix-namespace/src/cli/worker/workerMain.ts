import { processPackage } from "../../processPackage.js";
import { setupWorker } from "@eartool/batch";
import type { FixWorkspaceJob } from "../shared/FixWorkspaceJob.js";

setupWorker<FixWorkspaceJob>(async ({ logger, packagePath, dryRun, updateStatus, jobArgs }) => {
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
});

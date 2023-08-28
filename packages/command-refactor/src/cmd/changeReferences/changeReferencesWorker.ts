import type { MessagePort } from "node:worker_threads";
import type { WorkerData } from "@eartool/batch";
import {
  SimpleReplacements,
  addSingleFileReplacementsForRenames,
  type PackageExportRenames,
  processReplacements,
} from "@eartool/replacements";
import { createPackageContextFromWorkerData } from "./createPackageContextFromWorkerData.js";

export interface ChangeReferencesJobArgs {
  renames: PackageExportRenames;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ChangeReferencesJobResult {}

export async function workerMain(
  workerData: WorkerData<ChangeReferencesJobArgs>,
  _port: MessagePort
): Promise<ChangeReferencesJobResult> {
  const context = createPackageContextFromWorkerData(workerData);
  if (!context) return {};
  const replacements = new SimpleReplacements(context.logger);

  for (const sf of context.project.getSourceFiles()) {
    addSingleFileReplacementsForRenames(
      context,
      sf,
      workerData.jobArgs.renames,
      replacements,
      workerData.dryRun
    );
  }

  const changedFiles = [...processReplacements(context.project, replacements.getReplacementsMap())];

  if (workerData.dryRun) {
    context.logger.info("DRY RUN");
  } else {
    context.logger.info("Saving");
    await context.project.save();
  }
  return {};
}
export default workerMain;

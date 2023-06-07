export type { BatchJobOptions, JobInfo, JobSpec } from "./main/runBatchJob.js";
export { runBatchJob } from "./main/runBatchJob.js";
export type { WorkerData } from "./worker/setupWorker.js";
export { setupWorker } from "./worker/setupWorker.js";
export type { JobDef } from "./shared/JobDef.js";
export { makeBatchCommand } from "./main/yargs.js";

// TODO: Move to own package?
export { createWorkspaceInfo } from "./main/WorkspaceInfo.js";

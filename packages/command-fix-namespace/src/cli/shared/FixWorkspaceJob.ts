import type { JobDef } from "@eartool/batch";
import type { PackageExportRename } from "@eartool/replacements";
import type { WorkerArgs } from "./WorkerArgs.js";

export type FixWorkspaceJob = JobDef<WorkerArgs, PackageExportRename[]>;

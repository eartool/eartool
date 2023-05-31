import type { JobDef } from "@eartool/batch";
import type { WorkerArgs } from "./WorkerArgs.js";
import type { PackageExportRename } from "@eartool/replacements";

export type FixWorkspaceJob = JobDef<WorkerArgs, PackageExportRename[]>;

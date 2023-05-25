import type { BaseOptions } from "../../../../processProject.js";
import type { PackageExportRename } from "../../../../replacements/PackageExportRename.js";
import type { SenderId } from "./withSenderId.js";

export interface WorkerData extends BaseOptions {
  senderId: SenderId;
  packageName: string;
  packagePath: string;
  logDir: string;
  additionalRenames: Map<string, PackageExportRename[]>;
}

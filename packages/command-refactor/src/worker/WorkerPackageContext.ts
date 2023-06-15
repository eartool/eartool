import type { Replacements } from "@eartool/replacements";
import type { PackageContext } from "./PackageContext.js";

export interface WorkerPackageContext extends PackageContext {
  replacements: Replacements;
}

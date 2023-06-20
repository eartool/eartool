import type { Replacements } from "@eartool/replacements";
import type { PackageContext } from "@eartool/utils";

export interface WorkerPackageContext extends PackageContext {
  replacements: Replacements;
}

import type { Replacements } from "@eartool/replacements";
import type { PackageContext } from "../../../utils/src/PackageContext.js";

export interface WorkerPackageContext extends PackageContext {
  replacements: Replacements;
}

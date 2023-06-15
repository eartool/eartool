import type { Project } from "ts-morph";
import type { PackageName } from "@eartool/utils";
import type { Logger } from "pino";
import type { PackageExportRename } from "./PackageExportRename.js";
import { addSingleFileReplacementsForRenames } from "./addSingleFileReplacementsForRenames.js";
import type { Replacements } from "./Replacements.js";

// TODO This is going to be reall inefficient
export function getReplacementsForRenames(
  project: Project,
  renames: Map<PackageName, PackageExportRename[]>,
  replacements: Replacements,
  logger: Logger,
  dryRun: boolean
): void {
  for (const sf of project.getSourceFiles()) {
    addSingleFileReplacementsForRenames(sf, renames, replacements, logger, dryRun);
  }
}

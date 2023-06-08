import type { Project } from "ts-morph";
import type { PackageExportRename } from "./PackageExportRename.js";
import type { PackageName } from "@eartool/utils";
import { addSingleFileReplacementsForRenames } from "./addSingleFileReplacementsForRenames.js";
import type { Replacements } from "./Replacements.js";

// TODO This is going to be reall inefficient
export function getReplacementsForRenames(
  project: Project,
  renames: Map<PackageName, PackageExportRename[]>,
  replacements: Replacements,
  dryRun: boolean
): void {
  for (const sf of project.getSourceFiles()) {
    addSingleFileReplacementsForRenames(sf, renames, replacements, dryRun);
  }
}

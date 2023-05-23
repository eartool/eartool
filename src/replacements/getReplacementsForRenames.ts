import type { Project } from "ts-morph";
import type { PackageExportRename } from "./PackageExportRename.js";
import type { PackageName } from "../PackageName.js";
import type { Replacement } from "./Replacement.js";
import { addSingleFileReplacementsForRenames } from "./addSingleFileReplacementsForRenames.js";
import type { Logger } from "pino";

// TODO This is going to be reall inefficient
export function getReplacementsForRenames(
  project: Project,
  renames: Map<PackageName, PackageExportRename[]>,
  logger: Logger
) {
  const replacements: Replacement[] = [];

  for (const sf of project.getSourceFiles()) {
    addSingleFileReplacementsForRenames(sf, renames, replacements, logger);
  }
  return replacements;
}

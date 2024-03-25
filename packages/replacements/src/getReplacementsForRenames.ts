import type { PackageContext, PackageName } from "@eartool/utils";
import type { PackageExportRename } from "./PackageExportRename.js";
import { addSingleFileReplacementsForRenames } from "./addSingleFileReplacementsForRenames.js";
import type { Replacements } from "./Replacements.js";

// TODO This is going to be reall inefficient
export function getReplacementsForRenames(
  ctx: PackageContext,
  renames: Map<PackageName, PackageExportRename[]>,
  replacements: Replacements,
  dryRun: boolean,
): void {
  for (const sf of ctx.project.getSourceFiles()) {
    addSingleFileReplacementsForRenames(ctx, sf, renames, replacements, dryRun);
  }
}

import type { ExportDeclaration, ImportDeclaration } from "ts-morph";
import type { FilePath } from "../FilePath.js";
import { getPossibleFileLocations } from "../getPossibleFileLocations.js";
import type { PackageContext } from "../workspace/PackageContext.js";

export function findFileLocationForImportExport(
  ctx: PackageContext,
  decl: ImportDeclaration | ExportDeclaration,
): FilePath | undefined {
  // ctx.logger.debug({ options: getPossibleFileLocations(ctx, decl) }, "Looking for possible file locations");
  for (const possibleLocation of getPossibleFileLocations(ctx, decl)) {
    const sf = ctx.project.getSourceFile(possibleLocation);
    if (sf) return sf.getFilePath();
  }
}

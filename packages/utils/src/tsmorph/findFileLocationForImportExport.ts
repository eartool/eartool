import type { ExportDeclaration, ImportDeclaration } from "ts-morph";
import type { PackageContext } from "../workspace/PackageContext.js";
import { getPossibleFileLocations } from "../getPossibleFileLocations.js";
// import { getSimplifiedNodeInfoAsString } from "./getSimplifiedNodeInfo.js";
import type { FilePath } from "../FilePath.js";

export function findFileLocationForImportExport(
  ctx: PackageContext,
  decl: ImportDeclaration | ExportDeclaration
): FilePath | undefined {
  for (const possibleLocation of getPossibleFileLocations(ctx, decl)) {
    const sf = ctx.project.getSourceFile(possibleLocation);
    if (sf) return sf.getFilePath();
  }
}

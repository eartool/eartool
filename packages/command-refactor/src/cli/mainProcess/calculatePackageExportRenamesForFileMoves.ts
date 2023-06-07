import { getConsumedExports as getConsumedImportsAndExports } from "./getConsumedExports.js";
import * as path from "path";
import type { PackageExportRename } from "@eartool/replacements";
import type { Project } from "ts-morph";
import * as Assert from "assert";

/**
 * Ignores files that aren't in the project
 *
 * @param project
 * @param filesToMove
 * @param packagePath
 * @param destinationModule
 * @returns
 */
export function calculatePackageExportRenamesForFileMoves(
  project: Project,
  filesToMove: Set<string>,
  packagePath: string,
  destinationModule: string
) {
  const packageExportRenames: PackageExportRename[] = [];

  for (const q of filesToMove) {
    const sf = project.getSourceFile(q);
    if (!sf) continue;

    // in project only
    const consumed = getConsumedImportsAndExports(sf);

    const rootIndexFileExports = (
      consumed.get(path.join(packagePath, "src/index.ts")) ??
      consumed.get(path.join(packagePath, "src/index.tsx"))
    )?.reexports;

    Assert.ok(rootIndexFileExports != null);

    for (const exportName of rootIndexFileExports) {
      packageExportRenames.push({
        from: [exportName],
        to: [exportName],
        toFileOrModule: destinationModule,
      });
    }
  }

  return packageExportRenames;
}

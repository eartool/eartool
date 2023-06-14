import {
  addSingleFileReplacementsForRenames,
  processReplacements,
  SimpleReplacements,
  type PackageExportRenames,
} from "@eartool/replacements";
import type { FilePath } from "@eartool/utils";
import * as path from "node:path";
import type { Logger } from "pino";
import { removeFilesIfInProject } from "./removeFilesIfInProject.js";
import type { RelativeFileInfo } from "../main/setupOverall.js";
import { cleanupMovedFile } from "./cleanupMovedFile.js";
import { getRootFile } from "../getRootFile.js";
import { addReplacementsForExportsFromRemovedFiles } from "./addReplacementsForExportsFromRemovedFiles.js";
import { addReexports } from "./addReexports.js";
import type { WorkerPackageContext } from "./WorkerPackageContext.js";
import type { PackageContext } from "./PackageContext.js";
import type { SourceFile } from "ts-morph";

export interface FileContext extends PackageContext {
  sf: SourceFile;
}

export interface WithLogger {
  logger: Logger;
}

export async function processPackageReplacements(
  ctx: WorkerPackageContext,
  filesToRemove: Iterable<FilePath>,
  relativeFileInfoMap: Map<FilePath, RelativeFileInfo>,
  packageExportRenamesMap: PackageExportRenames,
  dryRun: boolean
) {
  ctx.logger.debug("filesToRemove %o", [...filesToRemove]);
  ctx.logger.debug(
    "packageExportRenames:\n%s",
    [...packageExportRenamesMap].flatMap(([filePathOrModule, renames]) =>
      renames
        .map((a) => `  - ${filePathOrModule}: ${a.from} to package ${a.toFileOrModule}`)
        .join("\n")
    )
  );

  addReplacementsForExportsFromRemovedFiles(ctx, filesToRemove);

  // FIXME this should be much better now that we pre-grouped above
  removeFilesIfInProject(ctx, filesToRemove);

  for (const [relPath, { fileContents, rootExports }] of relativeFileInfoMap) {
    const fullpath = path.resolve(ctx.packagePath, relPath);
    ctx.logger.trace("Adding file '%s'", fullpath);
    const sf = ctx.project.createSourceFile(fullpath, fileContents);

    // Gotta clean up the files we added
    cleanupMovedFile(ctx, sf);

    const rootFile = getRootFile(ctx.project);
    if (!rootFile) throw new Error("Couldnt find rootfile");
    // FIXME need to handle namespace exports too
    if (rootExports.size > 0) {
      addReexports(rootExports, ctx.replacements, rootFile, fullpath);
    }
  }

  // Simple renames
  for (const sf of ctx.project.getSourceFiles()) {
    addSingleFileReplacementsForRenames(
      sf,
      packageExportRenamesMap,
      ctx.replacements,
      ctx.logger,
      dryRun,
      getRootFile(ctx.project) === sf ? "imports" : "full"
    );
  }

  // actually updates files in project!
  const changedFiles = [
    ...processReplacements(ctx.project, ctx.replacements.getReplacementsMap()),
    ...filesToRemove,
  ];

  // Gotta clean up the mess we made
  // TODO:
  // - [ ] Remove empty import lines
  // - [ ] Remove empty export lines
  //
  // for (const filePath of changedFiles) {
  //   const sf = project.getSourceFile(filePath);
  // }
  return changedFiles;
}

import * as path from "node:path";
import {
  addSingleFileReplacementsForRenames,
  processReplacements,
  type PackageExportRenames,
} from "@eartool/replacements";
import type { FilePath, PackageContext } from "@eartool/utils";
import type { SourceFile } from "ts-morph";
import { getRootFile } from "@eartool/utils";
import type { RelativeFileInfo } from "../main/setupOverall.js";
import { removeFilesIfInProject } from "./removeFilesIfInProject.js";
import { cleanupMovedFile } from "./cleanupMovedFile.js";
import { addReplacementsForExportsFromRemovedFiles } from "./addReplacementsForExportsFromRemovedFiles.js";
import { addReexports } from "./addReexports.js";
import type { WorkerPackageContext } from "./WorkerPackageContext.js";

export interface FileContext extends PackageContext {
  sf: SourceFile;
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

  const rootFile = getRootFile(ctx.project);
  addReplacementsForExportsFromRemovedFiles(ctx, filesToRemove, rootFile);

  // FIXME this should be much better now that we pre-grouped above
  removeFilesIfInProject(ctx, filesToRemove);

  for (const [relPath, { fileContents, rootExports }] of relativeFileInfoMap) {
    const fullpath = path.resolve(ctx.packagePath, relPath);
    ctx.logger.info("Adding file '%s'", fullpath);
    const sf = ctx.project.createSourceFile(fullpath, fileContents);

    // Gotta clean up the files we added
    cleanupMovedFile(ctx, sf);

    // FIXME need to handle namespace exports too
    if (rootExports.size > 0) {
      if (!rootFile) throw new Error("Couldnt find rootfile");

      addReexports(rootExports, ctx.replacements, rootFile, fullpath);
    }
  }

  // Simple renames
  for (const sf of ctx.project.getSourceFiles()) {
    ctx.packagePath;
    addSingleFileReplacementsForRenames(
      ctx,
      sf,
      packageExportRenamesMap,
      ctx.replacements,
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

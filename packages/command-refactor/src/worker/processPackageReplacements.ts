import {
  addSingleFileReplacementsForRenames,
  processReplacements,
  SimpleReplacements,
  type PackageExportRenames,
} from "@eartool/replacements";
import type { PackageName, FilePath } from "@eartool/utils";
import * as path from "node:path";
import type { Logger } from "pino";
import type { Project } from "ts-morph";
import { removeFilesIfInProject } from "./removeFilesIfInProject.js";
import type { RelativeFileInfo } from "../main/setupOverall.js";
import { cleanupMovedFile } from "./cleanupMovedFile.js";
import { getRootFile } from "../getRootFile.js";
import { addReplacementsForExportsFromRemovedFiles } from "./addReplacementsForExportsFromRemovedFiles.js";
import { addReexports } from "./addReexports.js";

export async function processPackageReplacements(
  filesToRemove: Iterable<FilePath>,
  project: Project,
  relativeFileInfoMap: Map<FilePath, RelativeFileInfo>,
  packagePath: FilePath,
  packageName: PackageName,
  logger: Logger,
  packageExportRenamesMap: PackageExportRenames,
  dryRun: boolean
) {
  logger.debug("filesToRemove %o", [...filesToRemove]);
  logger.debug(
    "packageExportRenames:\n%s",
    [...packageExportRenamesMap].flatMap(([filePathOrModule, renames]) =>
      renames
        .map((a) => `  - ${filePathOrModule}: ${a.from} to package ${a.toFileOrModule}`)
        .join("\n")
    )
  );

  const replacements = new SimpleReplacements(logger);
  addReplacementsForExportsFromRemovedFiles(project, filesToRemove, replacements, logger);

  // FIXME this should be much better now that we pre-grouped above
  removeFilesIfInProject(filesToRemove, project, logger);

  for (const [relPath, { fileContents, rootExports }] of relativeFileInfoMap) {
    const fullpath = path.resolve(packagePath, relPath);
    logger.trace("Adding file '%s'", fullpath);
    const sf = project.createSourceFile(fullpath, fileContents);

    // Gotta clean up the files we added
    cleanupMovedFile(sf, packageName, replacements, dryRun);

    const rootFile = getRootFile(project);
    if (!rootFile) throw new Error("Couldnt find rootfile");
    // FIXME need to handle namespace exports too
    if (rootExports.size > 0) {
      addReexports(rootExports, replacements, rootFile, fullpath);
    }
  }

  // Simple renames
  for (const sf of project.getSourceFiles()) {
    logger.debug(sf.getFilePath());
    addSingleFileReplacementsForRenames(sf, packageExportRenamesMap, replacements, logger, dryRun);
  }

  // actually updates files in project!
  const changedFiles = [
    ...processReplacements(project, replacements.getReplacementsMap()),
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

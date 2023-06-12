import type { SimpleReplacements } from "@eartool/replacements";
import type { FilePath } from "@eartool/utils";
import type { Project } from "ts-morph";
import { getRootFile } from "../getRootFile.js";
import type { Logger } from "pino";

export function addReplacementsForExportsFromRemovedFiles(
  project: Project,
  filesToRemove: Iterable<FilePath>,
  replacements: SimpleReplacements,
  logger: Logger
) {
  const rootFile = getRootFile(project);
  if (!rootFile) throw new Error("Couldnt find root file");

  const setOfFilesToRemove = new Set(filesToRemove);
  if (setOfFilesToRemove.size == 0) return;

  for (const decl of rootFile.getExportDeclarations()) {
    const specifierFullFilePath = decl.getModuleSpecifierSourceFile()?.getFilePath();
    if (specifierFullFilePath && setOfFilesToRemove.has(specifierFullFilePath)) {
      logger.info(`Deleting ${decl.getText()} from ${rootFile.getFilePath()}`);
      replacements.replaceNode(decl, "");
    }
  }
}

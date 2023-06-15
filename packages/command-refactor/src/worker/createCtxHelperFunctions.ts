import { formatTestTypescript } from "@eartool/test-utils";
import * as path from "node:path";
import type { WorkerPackageContext } from "./WorkerPackageContext.js";
import type { PackageRelativeHelpers } from "./PackageRelativeHelpers.js";
import { processReplacements } from "@eartool/replacements";

export function createCtxHelperFunctions(ctx: WorkerPackageContext): PackageRelativeHelpers {
  const getSourceFile = (filePath: string) => {
    return ctx.project.getSourceFile(path.resolve(ctx.packagePath, filePath));
  };

  const getSourceFileOrThrow = (filePath: string) => {
    return ctx.project.getSourceFileOrThrow(path.resolve(ctx.packagePath, filePath));
  };

  const getFormattedFileContents = (filePath: string) => {
    return formatTestTypescript(getSourceFileOrThrow(filePath).getFullText());
  };

  const getTestResultsForFiles = (filePaths: Iterable<string>) => {
    return formatTestTypescript(
      [...filePaths]
        .map(
          (filePath) => `// ==========================================================
    // <>: ${filePath}
    //
    
    ${getSourceFile(filePath)?.getFullText() ?? "// FILE DOES NOT EXIST"}

    // 
    // </>: ${filePath}
    // ==========================================================
    `
        )
        .join("\n")
    );
  };

  const processReplacementsAndGetTestResultsForFiles = () => {
    const changedFiles = processReplacements(ctx.project, ctx.replacements.getReplacementsMap());
    ctx.project.saveSync();
    return { changedFiles, testResults: getTestResultsForFiles(changedFiles) };
  };

  return {
    getSourceFile,
    getSourceFileOrThrow,
    getFormattedFileContents,
    getTestResultsForFiles,
    processReplacementsAndGetTestResultsForFiles,
  };
}

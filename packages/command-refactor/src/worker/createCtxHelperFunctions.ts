import { processReplacements } from "@eartool/replacements";
import { formatTestTypescript } from "@eartool/test-utils";
import * as path from "node:path";
import type { PackageRelativeHelpers } from "./PackageRelativeHelpers.js";
import type { WorkerPackageContext } from "./WorkerPackageContext.js";

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

  const getTestResultsForFiles = async (filePaths: Iterable<string>) => {
    return await formatTestTypescript(
      [...filePaths]
        .map(
          (filePath) =>
            `// ==========================================================
    // <>: ${filePath}
    //
    
    ${getSourceFile(filePath)?.getFullText() ?? "// FILE DOES NOT EXIST"}

    // 
    // </>: ${filePath}
    // ==========================================================
    `,
        )
        .join("\n"),
    );
  };

  const processReplacementsAndGetTestResultsForFiles = async () => {
    const changedFiles = processReplacements(ctx.project, ctx.replacements.getReplacementsMap());
    ctx.project.saveSync();
    return { changedFiles, testResults: await getTestResultsForFiles(changedFiles) };
  };

  return {
    getSourceFile,
    getSourceFileOrThrow,
    getFormattedFileContents,
    getTestResultsForFiles,
    processReplacementsAndGetTestResultsForFiles,
  };
}

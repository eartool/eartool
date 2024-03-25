import type { SourceFile } from "ts-morph";

export interface PackageRelativeHelpers {
  getSourceFile: (filePath: string) => SourceFile | undefined;
  getSourceFileOrThrow: (filePath: string) => SourceFile;
  getFormattedFileContents: (filePath: string) => Promise<string>;
  getTestResultsForFiles: (filePaths: Iterable<string>) => Promise<string>;
  processReplacementsAndGetTestResultsForFiles: () => Promise<{
    changedFiles: Iterable<string>;
    testResults: string;
  }>;
}

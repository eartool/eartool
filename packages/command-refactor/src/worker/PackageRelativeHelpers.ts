import type { SourceFile } from "ts-morph";

export interface PackageRelativeHelpers {
  getSourceFile: (filePath: string) => SourceFile | undefined;
  getSourceFileOrThrow: (filePath: string) => SourceFile;
  getFormattedFileContents: (filePath: string) => string;
  getTestResultsForFiles: (filePaths: Iterable<string>) => string;
  processReplacementsAndGetTestResultsForFiles: () => {
    changedFiles: Iterable<string>;
    testResults: string;
  };
}

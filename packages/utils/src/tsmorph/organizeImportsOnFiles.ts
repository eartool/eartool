import type { Project } from "ts-morph";

export function organizeImportsOnFiles(
  project: Project,
  changedFilesIter: Iterable<string>,
  throwOnMissing = false,
) {
  for (const filePath of changedFilesIter) {
    project[throwOnMissing ? "getSourceFileOrThrow" : "getSourceFile"](filePath)?.organizeImports();
  }
}

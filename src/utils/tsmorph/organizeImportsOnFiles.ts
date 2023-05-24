import type { Project } from "ts-morph";

export function organizeImportsOnFiles(project: Project, changedFilesIter: Iterable<string>) {
  for (const filePath of changedFilesIter) {
    project.getSourceFileOrThrow(filePath).organizeImports();
  }
}

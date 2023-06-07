import * as path from "node:path";
import type { Project } from "ts-morph";

/**
 * For all files in `filesToMove`, if it is a part of the project, add its file contents
 * to the return map with the key being relative to the packagePath
 * @param project
 * @param packagePath
 * @param filesToMove
 * @returns
 */
export function getFileContentsRelatively(
  project: Project,
  packagePath: string,
  filesToMove: Set<string>
) {
  const fileContents = new Map</* relPath */ string, string>();
  for (const f of filesToMove) {
    const sf = project.getSourceFile(f);
    if (!sf) continue;
    fileContents.set(path.relative(packagePath, sf.getFilePath()), sf.getFullText());
  }
  return fileContents;
}

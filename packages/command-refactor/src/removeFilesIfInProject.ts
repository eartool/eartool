import type { Project } from "ts-morph";

export function removeFilesIfInProject(filesToMove: string[], project: Project) {
  for (const path of filesToMove) {
    const sf = project.getSourceFile(path);
    if (!sf) continue;

    project.removeSourceFile(sf);
  }
}

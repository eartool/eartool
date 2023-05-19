import type { Project } from "ts-morph";

export function dropDtsFiles(project: Project) {
  for (const sf of project.getSourceFiles()) {
    if (sf.getFilePath().endsWith(".d.ts")) {
      project.removeSourceFile(sf);
    }
  }
}

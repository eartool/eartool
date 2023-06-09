import type { Project } from "ts-morph";

export function getRootFile(project: Project) {
  return project
    .getRootDirectories()
    .flatMap((d) => [d.getSourceFile("index.ts"), d.getSourceFile("index.tsx")])
    .find((a) => a != null);
}

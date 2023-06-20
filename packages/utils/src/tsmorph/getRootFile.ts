import type { Project } from "ts-morph";

export function getRootFile(project: Project) {
  const { rootDir, rootDirs } = project.getCompilerOptions();

  const dirsToCheck = [
    ...(rootDir ? [rootDir] : []),
    ...(rootDirs ?? []),
    ...project.getRootDirectories().map((a) => a.getPath()),
  ];

  // console.log(dirsToCheck);

  return dirsToCheck
    .map((a) => project.getDirectory(a))
    .flatMap((d) => (d ? [d.getSourceFile("index.ts"), d.getSourceFile("index.tsx")] : []))
    .find((a) => a != null);
}

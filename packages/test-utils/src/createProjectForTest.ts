import { Project } from "ts-morph";
import { formatTestTypescript } from "./formatTestTypescript.js";

export function createProjectForTest(inputs: Record<string, string>) {
  const project = new Project({
    useInMemoryFileSystem: true,
    skipAddingFilesFromTsConfig: true,
  });
  for (const [name, contents] of Object.entries(inputs)) {
    project.createSourceFile(name, formatTestTypescript(contents));
  }
  project.saveSync();
  return project;
}

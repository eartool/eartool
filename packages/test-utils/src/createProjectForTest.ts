import { Project } from "ts-morph";
import { formatTestTypescript } from "./formatTestTypescript.js";

export function createProjectForTest(
  inputs: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-inferrable-types
  verifyCompiles: boolean = false
) {
  const project = new Project({
    useInMemoryFileSystem: true,
    skipAddingFilesFromTsConfig: true,
  });
  for (const [name, contents] of Object.entries(inputs)) {
    project.createSourceFile(name, formatTestTypescript(contents));
  }
  project.saveSync();

  if (verifyCompiles) {
    const diag = project.getPreEmitDiagnostics();
    if (diag.length) {
      throw diag.map((d) => ({ category: d.getCategory(), c: d.getMessageText() }));
    }
  }
  return project;
}

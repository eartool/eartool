import { Project } from "ts-morph";
import { processFile } from "./processFile.js";


export async function processProject(project: Project) {
  for (const sf of project.getSourceFiles()) {
    processFile(sf);
  }

  for (const sf of project.getSourceFiles()) {
    sf.organizeImports();
  }
  await project.save();
}

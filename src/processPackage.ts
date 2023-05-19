import * as path from "node:path";
import { Project } from "ts-morph";
import { processProject, type ProcessProjectOpts } from "./processProject.js";
import { type Logger } from "pino";

/*
    Goal: lets get const / function / class / statement out of namespaces

    Lazy Approach:
    * 1 namespace per file per run
    * Extract to `niceName(namespaceName, namedEntity)`
    * Find all references to old `namedEntity` in package and replace with new name?
    * Add import to new name
    * Org imports
    * If something exports `namespaceName` then it needs to also export `newName`
    * Delete namespace if empty

*/
export async function processPackage(packagePath: string, opts: ProcessProjectOpts) {
  const project = new Project({
    tsConfigFilePath: path.join(packagePath, "tsconfig.json"),
    skipLoadingLibFiles: true,
  });

  return await processProject(project, opts);
}

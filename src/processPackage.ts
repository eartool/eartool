import * as path from "node:path";
import * as fs from "node:fs";
import { Project } from "ts-morph";
import { processProject, type ProcessProjectOpts } from "./processProject.js";

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
  const tsconfigPath = path.join(packagePath, "tsconfig.json");

  try {
    await fs.promises.stat(tsconfigPath);
  } catch (err) {
    opts.logger.warn(`Skipping package due to missing tsconfig: ${packagePath}`);
    return Promise.resolve({ exportedRenames: [] });
  }

  const project = new Project({
    tsConfigFilePath: tsconfigPath,
    skipLoadingLibFiles: true,
  });

  return await processProject(project, opts);
}

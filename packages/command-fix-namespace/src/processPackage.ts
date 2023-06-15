import { maybeLoadProject } from "@eartool/utils";
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
  const project = maybeLoadProject(packagePath);

  if (!project) {
    opts.logger.warn(`Skipping package due to missing tsconfig: ${packagePath}`);
    return Promise.resolve({ exportedRenames: [] });
  }

  return await processProject(project, opts);
}

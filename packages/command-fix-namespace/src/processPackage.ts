import * as path from "node:path";
import type { FilePath, PackageName } from "@eartool/utils";
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
export async function processPackage(
  packageName: PackageName,
  packagePath: FilePath,
  opts: ProcessProjectOpts
) {
  const project = maybeLoadProject(packagePath);

  if (!project) {
    opts.logger.debug(`Skipping package due to missing tsconfig: ${packagePath}`);
    return Promise.resolve({ exportedRenames: [] });
  }

  return await processProject(
    {
      project,
      logger: opts.logger,
      packageName,
      packagePath,
      packageJson: JSON.parse(
        project.getFileSystem().readFileSync(path.join(packagePath, "package.json"))
      ),
    },
    opts
  );
}
//

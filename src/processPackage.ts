import { Project } from "ts-morph";
import * as path from "node:path";

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
function processPackage(packagePath: string) {
  const project = new Project({
    tsConfigFilePath: path.join(packagePath, "tsconfig.json"),
  });

  for (const sf of project.getSourceFiles()) {
    //
  }
}

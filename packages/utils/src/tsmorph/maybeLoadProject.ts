import * as path from "node:path";
import * as fs from "node:fs";
import { Project } from "ts-morph";

export function maybeLoadProject(packagePath: string) {
  const tsconfigPath = path.join(packagePath, "tsconfig.json");

  try {
    fs.statSync(tsconfigPath);
  } catch (err) {
    return undefined;
  }

  return new Project({
    tsConfigFilePath: tsconfigPath,
    skipLoadingLibFiles: true,
    skipFileDependencyResolution: true,
  });
}

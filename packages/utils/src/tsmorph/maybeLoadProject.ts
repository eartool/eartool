import * as fs from "node:fs";
import * as path from "node:path";
import type { Logger } from "pino";
import { Project } from "ts-morph";

export function maybeLoadProject(packagePath: string, logger: Logger) {
  const tsconfigPath = path.join(packagePath, "tsconfig.json");

  try {
    fs.statSync(tsconfigPath);
  } catch (err) {
    logger.fatal({ err }, "Unable to find tsconrfig file: " + tsconfigPath);
    return undefined;
  }

  return new Project({
    tsConfigFilePath: tsconfigPath,
    skipLoadingLibFiles: true,
    skipFileDependencyResolution: true,
  });
}

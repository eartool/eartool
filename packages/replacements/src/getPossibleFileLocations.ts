import type { FilePath } from "@eartool/utils";
import type { Project } from "ts-morph";
import * as path from "node:path";

export function getPossibleFileLocations(project: Project, relPath: FilePath) {
  if (!relPath.startsWith(".")) return [];
  if (relPath.endsWith(".js")) {
    // module land
    throw new Error("Not implemented: " + relPath);
  }

  return project
    .getRootDirectories()
    .flatMap((d) => [".ts", ".tsx"].map((ext) => path.resolve(d.getPath(), relPath + ext)));
}

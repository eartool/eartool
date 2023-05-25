import type { SourceFile } from "ts-morph";

/**
  lazy handling of exports. ideally would respect package.json exports
*/
export function isRootExport(sourceFile: SourceFile) {
  for (const dir of sourceFile.getProject().getRootDirectories()) {
    if (sourceFile.getDirectory() == dir && sourceFile.getBaseNameWithoutExtension() == "index") {
      return true;
    }
  }
  return false;
}

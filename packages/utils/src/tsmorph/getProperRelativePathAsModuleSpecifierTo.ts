import type { FilePath } from "@eartool/utils";
import { ModuleResolutionKind, type SourceFile } from "ts-morph";

const needsJsSuffix: Set<ModuleResolutionKind | undefined> = new Set([
  ModuleResolutionKind.Node16,
  ModuleResolutionKind.NodeNext,
]);
export function getProperRelativePathAsModuleSpecifierTo(
  rootFile: SourceFile,
  fullpath: SourceFile | FilePath,
) {
  return (
    rootFile.getRelativePathAsModuleSpecifierTo(fullpath as SourceFile)
    + (needsJsSuffix.has(rootFile.getProject().getCompilerOptions().moduleResolution) ? ".js" : "")
  );
}

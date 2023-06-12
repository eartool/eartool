import { SimpleReplacements } from "@eartool/replacements";
import { type FilePath } from "@eartool/utils";
import type { SourceFile } from "ts-morph";

export function addReexports(
  rootExports: Map<string, string>,
  replacements: SimpleReplacements,
  rootFile: SourceFile,
  fullpath: FilePath
) {
  if ([...rootExports].some(([_name, alias]) => alias === "default")) {
    throw new Error("Default alias is not currently supported");
  }

  const exportSpecifiers = [...rootExports]
    .map(([name, alias]) => (name === alias ? name : `${name} as ${alias}`))
    .join(", ");

  replacements.addReplacement(
    rootFile.getFilePath(),
    rootFile.getTrailingTriviaEnd(),
    rootFile.getTrailingTriviaEnd(),
    `export {${exportSpecifiers}} from "${rootFile.getRelativePathAsModuleSpecifierTo(fullpath)}";`
  );
}

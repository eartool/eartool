import type { Replacements } from "@eartool/replacements";
import { getProperRelativePathAsModuleSpecifierTo, type FilePath } from "@eartool/utils";
import { type SourceFile } from "ts-morph";

export function addReexports(
  rootExports: Map<string, string>,
  replacements: Replacements,
  rootFile: SourceFile,
  fullpath: FilePath
) {
  if ([...rootExports].some(([_name, alias]) => alias === "default")) {
    throw new Error("Default alias is not currently supported");
  }

  const exportSpecifiers = [...rootExports]
    .map(([name, alias]) => (name === alias ? name : `${name} as ${alias}`))
    .join(", ");

  // This hack shouldnt be needed!
  const moduleSpecifier = getProperRelativePathAsModuleSpecifierTo(rootFile, fullpath);
  const exportLine = `export {${exportSpecifiers}} from "${moduleSpecifier}";`;

  replacements.logger.info("Adding `%s` to %s", exportLine, rootFile.getFilePath());

  replacements.addReplacement(
    rootFile.getFilePath(),
    rootFile.getTrailingTriviaEnd(),
    rootFile.getTrailingTriviaEnd(),
    exportLine
  );
}

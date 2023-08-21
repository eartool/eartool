import type { Replacements } from "@eartool/replacements";
import { getProperRelativePathAsModuleSpecifierTo, type FilePath } from "@eartool/utils";
import { type SourceFile } from "ts-morph";

export function addReexports(
  rootExports: Map<string, { exportName: string[]; isType: boolean }>,
  replacements: Replacements,
  rootFile: SourceFile,
  fullpath: FilePath
) {
  if (
    [...rootExports].some(
      ([_name, { exportName }]) => exportName.length == 1 && exportName[0] === "default"
    )
  ) {
    throw new Error("Default alias is not currently supported");
  }

  const allAreTypes = [...rootExports].every(([_name, { isType }]) => isType);

  const exportSpecifiers = [...rootExports]
    .map(([name, { exportName, isType }]) =>
      name === exportName[0]
        ? name
        : `${allAreTypes || !isType ? "" : "type "}${name} as ${exportName}`
    )
    .join(", ");

  // This hack shouldnt be needed!
  const moduleSpecifier = getProperRelativePathAsModuleSpecifierTo(rootFile, fullpath);
  const exportLine = `export ${
    allAreTypes ? "type " : ""
  }{${exportSpecifiers}} from "${moduleSpecifier}";`;

  replacements.logger.info("Adding `%s` to %s", exportLine, rootFile.getFilePath());

  replacements.addReplacement(
    rootFile.getFilePath(),
    rootFile.getTrailingTriviaEnd(),
    rootFile.getTrailingTriviaEnd(),
    exportLine
  );
}

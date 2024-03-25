import type { SourceFile } from "ts-morph";
import { getImportSpecifier } from "./getImportSpecifier.js";

export function getImportSpecifierOrThrow(
  sf: SourceFile,
  moduleSpecifierString: string,
  name: string,
) {
  const ret = getImportSpecifier(sf, moduleSpecifierString, name);
  if (!ret) {
    throw new Error(
      `Expected to find an import specifier named '${name}' and imported from "${moduleSpecifierString}`,
    );
  }
  return ret;
}

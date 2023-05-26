import type { SourceFile } from "ts-morph";

export function getImportSpecifier(sf: SourceFile, moduleSpecifierString: string, name: string) {
  return sf
    .getImportDeclaration(moduleSpecifierString)
    ?.getNamedImports()
    ?.find((namedImport) => namedImport.getName() == name);
}

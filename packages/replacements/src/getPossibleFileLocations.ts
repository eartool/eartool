import * as path from "node:path";
import type { ExportDeclaration, ImportDeclaration } from "ts-morph";

export function getPossibleFileLocations(decl: ImportDeclaration | ExportDeclaration) {
  const moduleSpecifier = decl.getModuleSpecifierValue();
  if (!moduleSpecifier) return [];

  // we only do this for relative imports
  if (!moduleSpecifier.startsWith(".")) return [];

  if (moduleSpecifier.endsWith(".js")) {
    // module land
    throw new Error("Not implemented: " + moduleSpecifier);
  }

  const project = decl.getProject();
  const sf = decl.getSourceFile();
  const rootDirSfIsIn = project
    .getRootDirectories()
    .find((d) => sf.getFilePath().startsWith(d.getPath()));
  if (!rootDirSfIsIn) {
    throw new Error(
      "Somehow we ended up with a source file thats not in a root dir: " + sf.getFilePath()
    );
  }

  // If we only had a single root dir, this would be the full path (minus the .ts or .tsx)
  // FUTURE: If we are supporting modern javascript imports the extension here will
  // be .js but thats not what we are looking for.
  const moduleSpecifierFull = path.resolve(sf.getDirectoryPath(), moduleSpecifier);

  // we need to convert this back to relative to the root of the package
  const relPathToRootDir = path.relative(rootDirSfIsIn.getPath(), moduleSpecifierFull);

  return project
    .getRootDirectories()
    .flatMap((d) =>
      [".ts", ".tsx"].map((ext) => path.resolve(d.getPath(), relPathToRootDir + ext))
    );
}

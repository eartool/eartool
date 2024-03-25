import * as path from "node:path";
import { ModuleKind, type ExportDeclaration, type ImportDeclaration } from "ts-morph";
import type { PackageContext } from "./workspace/PackageContext.js";

export function getPossibleFileLocations(
  ctx: PackageContext,
  decl: ImportDeclaration | ExportDeclaration,
) {
  const moduleSpecifier = decl.getModuleSpecifierValue();
  if (!moduleSpecifier) return [];

  // we only do this for relative imports
  if (!moduleSpecifier.startsWith(".")) return [];

  let esModule = false;
  if (moduleSpecifier.endsWith(".js")) {
    const { module } = decl.getProject().getCompilerOptions();
    if (module == ModuleKind.Node16 || module == ModuleKind.NodeNext) {
      //
    } else if (ctx.packageJson.type != "module") {
      throw new Error("importing a direct js file is a hack right now that requires modules");
    }

    esModule = true;
  }

  const project = decl.getProject();
  const sf = decl.getSourceFile();
  const rootDirSfIsIn = project
    .getRootDirectories()
    .find((d) => sf.getFilePath().startsWith(d.getPath()));
  if (!rootDirSfIsIn) {
    // since getRootDirectories() is confusing, this is probably not the check we want.
    throw new Error(
      "Somehow we ended up with a source file thats not in a root dir: " + sf.getFilePath(),
    );
  }

  // If we only had a single root dir, this would be the full path (minus the .ts or .tsx)
  // FUTURE: If we are supporting modern javascript imports the extension here will
  // be .js but thats not what we are looking for.
  const moduleSpecifierFull = path.resolve(
    sf.getDirectoryPath(),
    esModule ? moduleSpecifier.substring(0, moduleSpecifier.length - 3) : moduleSpecifier,
  );

  // we need to convert this back to relative to the root of the package
  const relPathToRootDir = path.relative(rootDirSfIsIn.getPath(), moduleSpecifierFull);

  return project
    .getRootDirectories()
    .flatMap((d) =>
      (esModule
        ? [".ts", ".tsx", ".js"]
        : [".ts", ".tsx", ".js", "/index.ts", "/index.tsx", "/index.js"]
      ).map((ext) => path.resolve(d.getPath(), relPathToRootDir + ext)),
    );
}

import * as path from "node:path";
import type { FileSystemHost } from "ts-morph";

export interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export function readPackageJson(fileSystem: FileSystemHost, packagePath: string): PackageJson {
  return JSON.parse(fileSystem.readFileSync(path.join(packagePath, "package.json"), "utf8"));
}

export function writePackageJson(
  fileSystem: FileSystemHost,
  packagePath: string,
  contents: PackageJson
) {
  fileSystem.writeFileSync(
    path.join(packagePath, "package.json"),
    JSON.stringify(contents, undefined, 2)
  );
}

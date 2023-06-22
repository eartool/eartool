import type { PackageName } from "./PackageName.js";

export interface PackageJsonDepsRequired {
  dependencies: Map<PackageName, string>;
  devDependencies: Map<PackageName, string>;
}

export function mergePackageJsonDeps({
  from,
  into,
}: {
  from: PackageJsonDepsRequired;
  into: PackageJsonDepsRequired;
}) {
  for (const type of ["dependencies", "devDependencies"] as const) {
    for (const [depName, depVersion] of from[type]) {
      into[type].set(depName, depVersion);
    }
  }
}

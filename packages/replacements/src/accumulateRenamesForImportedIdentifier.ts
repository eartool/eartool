import { SyntaxKind, type ImportSpecifier } from "ts-morph";
import type { PackageExportRename } from "./PackageExportRename.js";
import { findEntireQualifiedNameTree } from "@eartool/utils";
import type { Identifier } from "ts-morph";
import * as Assert from "assert";
import type { Replacements } from "./Replacements.js";

export function accumulateRenamesForImportedIdentifier(
  importedIdentifier: Identifier,
  packageExportRenames: PackageExportRename[],
  replacements: Replacements
): void;
export function accumulateRenamesForImportedIdentifier(
  importedIdentifier: Identifier,
  packageExportRenames: PackageExportRename[],
  replacements: Replacements,
  addedImportSet: Set<unknown>,
  importSpec: ImportSpecifier
): void;
export function accumulateRenamesForImportedIdentifier(
  importedIdentifier: Identifier,
  packageExportRenames: PackageExportRename[],
  replacements: Replacements,
  // in this case we can skip the add
  addedImportSet?: Set<unknown> | undefined,
  importSpec?: ImportSpecifier | undefined
) {
  Assert.ok(
    (addedImportSet == null && importSpec == null) || (addedImportSet != null && importSpec != null)
  );
  for (const refNode of importedIdentifier.findReferencesAsNodes()) {
    if (refNode === importedIdentifier) continue; // I hate this edge case of tsmorph
    if (refNode.getSourceFile() !== importedIdentifier.getSourceFile()) continue;

    for (const packageExportRename of packageExportRenames) {
      const fullyQualifiedInstance = findEntireQualifiedNameTree(refNode, packageExportRename.from);
      if (!fullyQualifiedInstance) continue;

      if (importSpec && addedImportSet && !addedImportSet.has(packageExportRename)) {
        addedImportSet.add(packageExportRename);
        replacements.insertBefore(importSpec, `${packageExportRename.to[0]},`);
      }

      replacements.replaceNode(fullyQualifiedInstance, packageExportRename.to.join("."));

      if (packageExportRename.toFileOrModule) {
        replacements.replaceNode(
          importedIdentifier
            .getFirstAncestorByKindOrThrow(SyntaxKind.ImportDeclaration)
            .getModuleSpecifier(),
          `"${packageExportRename.toFileOrModule}"`
        );
      }
    }
  }
}

import { SyntaxKind, type ImportSpecifier } from "ts-morph";
import type { PackageExportRename } from "./PackageExportRename.js";
import { findEntireQualifiedNameTree } from "@eartool/utils";
import type { Identifier, ExportSpecifier } from "ts-morph";
import * as Assert from "assert";
import type { Replacements } from "./Replacements.js";

export function accumulateRenamesForImportedIdentifier(
  importedOrExportedIdentifier: Identifier,
  packageExportRenames: PackageExportRename[],
  replacements: Replacements
): void;
export function accumulateRenamesForImportedIdentifier(
  importedOrExportedIdentifier: Identifier,
  packageExportRenames: PackageExportRename[],
  replacements: Replacements,
  alreadyProcessed: Set<unknown>,
  specifier: ImportSpecifier | ExportSpecifier
): void;
export function accumulateRenamesForImportedIdentifier(
  identifier: Identifier,
  packageExportRenames: PackageExportRename[],
  replacements: Replacements,
  // in this case we can skip the add
  alreadyProcessed?: Set<unknown> | undefined,
  specifier?: ImportSpecifier | ExportSpecifier | undefined
) {
  Assert.ok(
    (alreadyProcessed == null && specifier == null) ||
      (alreadyProcessed != null && specifier != null)
  );
  for (const refNode of identifier.findReferencesAsNodes()) {
    const maybeExportSpecifier = refNode.getParentIfKind(SyntaxKind.ExportSpecifier);

    if (!maybeExportSpecifier && refNode === identifier) continue; // I hate this edge case of tsmorph
    if (refNode.getSourceFile() !== identifier.getSourceFile()) continue;

    for (const packageExportRename of packageExportRenames) {
      const fullyQualifiedInstance = findEntireQualifiedNameTree(refNode, packageExportRename.from);
      if (!fullyQualifiedInstance) continue;

      if (specifier && alreadyProcessed && !alreadyProcessed.has(packageExportRename)) {
        alreadyProcessed.add(packageExportRename);
        if (packageExportRename.to[0] != packageExportRename.from[0]) {
          replacements.insertBefore(specifier, `${packageExportRename.to[0]},`);
        }
      }

      replacements.replaceNode(fullyQualifiedInstance, packageExportRename.to.join("."));

      if (packageExportRename.toFileOrModule) {
        replacements.replaceNode(
          identifier
            .getFirstAncestorByKindOrThrow(
              maybeExportSpecifier ? SyntaxKind.ExportDeclaration : SyntaxKind.ImportDeclaration
            )
            .getModuleSpecifier()!,
          `"${packageExportRename.toFileOrModule}"`
        );
      }
    }
  }
}

import * as Assert from "assert";
import { findEntireQualifiedNameTree } from "@eartool/utils";
import type { ExportSpecifier, Identifier, ImportSpecifier } from "ts-morph";
import { SyntaxKind } from "ts-morph";
import type { PackageExportRename } from "./PackageExportRename.js";
import type { Replacements } from "./Replacements.js";

export function accumulateRenamesForImportedIdentifier(
  importedOrExportedIdentifier: Identifier,
  packageExportRenames: PackageExportRename[],
  replacements: Replacements,
  skipCleanup: boolean
): void;
export function accumulateRenamesForImportedIdentifier(
  importedOrExportedIdentifier: Identifier,
  packageExportRenames: PackageExportRename[],
  replacements: Replacements,
  skipCleanup: boolean,
  alreadyProcessed: Set<unknown>,
  specifier: ImportSpecifier | ExportSpecifier
): void;
export function accumulateRenamesForImportedIdentifier(
  identifier: Identifier,
  packageExportRenames: PackageExportRename[],
  replacements: Replacements,
  skipCleanup: boolean,
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

      if (packageExportRename.toFileOrModule && specifier) {
        // TODO: This code causes an import to retain an empty set of braces
        if (!alreadyProcessed || !alreadyProcessed.has(packageExportRename)) {
          addImportOrExport(
            replacements,
            specifier,
            packageExportRename.to?.[0],
            packageExportRename.toFileOrModule,
            !skipCleanup
          );
          alreadyProcessed?.add(packageExportRename);
        }
      } else {
        if (packageExportRename.to != undefined) {
          if (
            specifier &&
            alreadyProcessed &&
            !alreadyProcessed.has(packageExportRename) &&
            packageExportRename.to[0] != packageExportRename.from[0]
          ) {
            alreadyProcessed.add(packageExportRename);
            replacements.insertBefore(specifier, `${packageExportRename.to[0]},`);
          }

          const fullReplacement = packageExportRename.to.join(".");

          replacements.replaceNode(fullyQualifiedInstance, fullReplacement);
        }

        if (packageExportRename.toFileOrModule) {
          const decl = identifier.getFirstAncestorByKindOrThrow(
            maybeExportSpecifier ? SyntaxKind.ExportDeclaration : SyntaxKind.ImportDeclaration
          );

          // This is broken i am positive FIXME
          replacements.replaceNode(
            decl.getModuleSpecifier()!,
            `"${packageExportRename.toFileOrModule}"`
          );
        }
      }
    }
  }
}

export function addImportOrExport(
  replacements: Replacements,
  specifier: ImportSpecifier | ExportSpecifier,
  newSymbolName: string | undefined,
  newModuleSpecifier: string,
  cleanup: boolean
) {
  const keyword = specifier.isKind(SyntaxKind.ExportSpecifier) ? "export" : "import";
  const decl = specifier.getFirstAncestorByKindOrThrow(
    specifier.isKind(SyntaxKind.ExportSpecifier)
      ? SyntaxKind.ExportDeclaration
      : SyntaxKind.ImportDeclaration
  );

  const symbolName = newSymbolName ?? specifier.getName();
  const importLine = `${keyword} { ${symbolName} } from "${newModuleSpecifier}";`;

  replacements.insertAfter(decl, `\n${importLine}`);
  if (cleanup) {
    replacements.deleteNode(specifier.getNameNode());
    replacements.removeNextSiblingIfComma(specifier);
  }
}

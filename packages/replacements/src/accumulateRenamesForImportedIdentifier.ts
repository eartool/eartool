import { SyntaxKind, type ImportSpecifier } from "ts-morph";
import type { PackageExportRename } from "./PackageExportRename.js";
import { findEntireQualifiedNameTree } from "@eartool/utils";
import type { ExportSpecifier } from "ts-morph";
import type { Identifier } from "ts-morph";
import * as Assert from "assert";
import type { Replacements } from "./Replacements.js";

export function accumulateRenamesForImportedIdentifier(
  importedOrExportedIdentifier: Identifier,
  packageExportRenames: PackageExportRename[],
  replacements: Replacements,
  dryRun: boolean
): void;
export function accumulateRenamesForImportedIdentifier(
  importedOrExportedIdentifier: Identifier,
  packageExportRenames: PackageExportRename[],
  replacements: Replacements,
  dryRun: boolean,
  alreadyProcessed: Set<unknown>,
  specifier: ImportSpecifier | ExportSpecifier
): void;
export function accumulateRenamesForImportedIdentifier(
  identifier: Identifier,
  packageExportRenames: PackageExportRename[],
  replacements: Replacements,
  dryRun: boolean,
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
        addImportOrExport(
          replacements,
          specifier,
          packageExportRename.to?.[0],
          packageExportRename.toFileOrModule,
          dryRun
        );
      } else {
        if (packageExportRename.to != undefined) {
          if (
            specifier &&
            alreadyProcessed &&
            !alreadyProcessed.has(packageExportRename) &&
            packageExportRename.to[0] != packageExportRename.from[0]
          ) {
            alreadyProcessed.add(packageExportRename);

            replacements.logger[dryRun ? "info" : "trace"](
              "DRYRUN: Would be adding `%s` to `%s` in %s",
              packageExportRename.to[0],
              specifier.getText(),
              specifier.getSourceFile().getFilePath()
            );

            replacements.insertBefore(specifier, `${packageExportRename.to[0]},`);
          }

          const fullReplacement = packageExportRename.to.join(".");

          replacements.logger[dryRun ? "info" : "trace"](
            "DRYRUN: Would be replacing `%s` with `%s` in %s",
            fullyQualifiedInstance.getText(),
            fullReplacement,
            fullyQualifiedInstance.getSourceFile().getFilePath()
          );

          replacements.replaceNode(fullyQualifiedInstance, fullReplacement);
        }

        if (packageExportRename.toFileOrModule) {
          const decl = identifier.getFirstAncestorByKindOrThrow(
            maybeExportSpecifier ? SyntaxKind.ExportDeclaration : SyntaxKind.ImportDeclaration
          );

          replacements.logger[dryRun ? "info" : "trace"](
            'DRYRUN: Would be replacing `"%s"` with `"%s"` in %s',
            decl.getModuleSpecifier()!.getText(),
            `"${packageExportRename.toFileOrModule}"`,
            fullyQualifiedInstance.getSourceFile().getFilePath()
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

function addImportOrExport(
  replacements: Replacements,
  specifier: ImportSpecifier | ExportSpecifier,
  newSymbolName: string | undefined,
  newModuleSpecifier: string,
  dryRun: boolean
) {
  const keyword = specifier.isKind(SyntaxKind.ExportSpecifier) ? "export" : "import";
  const decl = specifier.getFirstAncestorByKindOrThrow(
    specifier.isKind(SyntaxKind.ExportSpecifier)
      ? SyntaxKind.ExportDeclaration
      : SyntaxKind.ImportDeclaration
  );

  const symbolName = newSymbolName ?? specifier.getName();
  const importLine = `${keyword} { ${symbolName} } from "${newModuleSpecifier}";`;

  replacements.logger[dryRun ? "info" : "trace"](
    "Adding import `%s` to %s",
    importLine,
    decl.getSourceFile().getFilePath()
  );
  replacements.logger[dryRun ? "info" : "trace"](
    "Deleting `%s` from `%s` in %s",
    specifier.getNameNode().getText(),
    decl.getText(),
    specifier.getSourceFile().getFilePath()
  );
  replacements.insertBefore(decl, `${importLine}\n`);
  replacements.replaceNode(specifier.getNameNode(), "");
  replacements.removeNextSiblingIfComma(specifier);
}

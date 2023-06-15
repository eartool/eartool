import type { Logger } from "pino";
import {
  SyntaxKind,
  type ExportDeclaration,
  type Identifier,
  type ImportDeclaration,
  type NamespaceExport,
  type SourceFile,
} from "ts-morph";
import type { PackageExportRename, PackageExportRenames } from "./PackageExportRename.js";
import type { Replacements } from "./Replacements.js";
import { accumulateRenamesForImportedIdentifier } from "./accumulateRenamesForImportedIdentifier.js";
import { getNamedSpecifiers } from "./getNamedSpecifiers.js";
import { getNamespaceIdentifier } from "./getNamespaceIdentifier.js";
import { getPossibleFileLocations } from "./getPossibleFileLocations.js";
import { weakMemo } from "./weakMemo.js";

// FIXME: This function is way too complex now because I tried to reuse the
// renames structure for the full file path support to deal with moved files
// leaving the current package and going elsewhere and needing to update
// the other files in that package. I regret this and will need to fix this.
export function addSingleFileReplacementsForRenames(
  sf: SourceFile,
  renames: PackageExportRenames,
  replacements: Replacements,
  logger: Logger,
  dryRun: boolean,
  mode: "full" | "imports" | "exports" = "full"
) {
  // Keep this separated out so we can use conditional break points
  const filename = sf.getFilePath();

  const fullFilePathRenames = new Map(
    [...renames].filter(([packageName]) => packageName.startsWith("/"))
  );
  logger.debug("TOP OF FILE %s", filename);
  if (fullFilePathRenames.size > 0) {
    logger.debug(
      "addSingleFileReplacementsForRenames(): Full file path renames:\n%s",
      [...fullFilePathRenames].flatMap(([filePathOrModule, renames]) =>
        renames
          .map((a) => `  - ${filePathOrModule}: ${a.from} to package ${a.toFileOrModule}`)
          .join("\n")
      )
    );
  } else {
    logger.debug("addSingleFileReplacementsForRenames(): Full file path renames: NONE");
  }

  if (mode === "full" || mode === "imports") {
    const importDecls = sf.getImportDeclarations();
    accumulateRenamesForAllDecls(importDecls, fullFilePathRenames, replacements, renames);
  }

  if (mode === "full" || mode === "exports") {
    const decls = sf.getExportDeclarations();
    accumulateRenamesForAllDecls(decls, fullFilePathRenames, replacements, renames);
  }
}

function accumulateRenamesForAllDecls(
  decls: ImportDeclaration[] | ExportDeclaration[],
  fullFilePathRenames: PackageExportRenames,
  replacements: Replacements,
  renames: PackageExportRenames
) {
  const alreadyAdded = new Set();
  for (const decl of decls) {
    const moduleSpecifier = decl.getModuleSpecifier();
    if (!moduleSpecifier) continue;

    const possibleLocations = getPossibleFileLocations(decl);

    // deal with full file path renames specially
    for (const [fullPathToRename, renamesForPackage] of fullFilePathRenames) {
      replacements.logger.debug("Huh");
      const declMatchesPossibleFile = possibleLocations.some((l) => l == fullPathToRename);
      if (!declMatchesPossibleFile) continue;
      if (renamesForPackage.length === 0) continue; // Should never happen but I like assurances

      // We don't have to rename individual parts here for the target change as we know
      // the whole file was part of it.
      {
        const expected = renamesForPackage[0]!.toFileOrModule;
        for (const q of renamesForPackage) {
          if (q.toFileOrModule !== expected) {
            throw new Error("We don't support moving a file import to multiple locations!");
          }
        }
      }

      // FUTURE ME: One day we will probably want to rename some variables and
      // where they come from and this logic will need to be udpated

      const { toFileOrModule } = renamesForPackage[0];
      if (toFileOrModule) {
        replacements.replaceNode(moduleSpecifier, `"${toFileOrModule}"`);
      } else {
        accumulateRenamesForDecl(decl, renamesForPackage, replacements, alreadyAdded);
      }
    }

    const renamesForPackage = renames.get(moduleSpecifier.getLiteralText());
    if (!renamesForPackage) continue;

    accumulateRenamesForDecl(decl, renamesForPackage, replacements, alreadyAdded);
  }
}

const getFirstWordsAsSet = weakMemo(function getFirstWordsAsSet(
  renamesForPackage: PackageExportRename[]
) {
  return new Set(renamesForPackage.map((a) => a.from[0]));
});

function accumulateRenamesForDecl(
  decl: ImportDeclaration | ExportDeclaration,
  renamesForPackage: PackageExportRename[],
  replacements: Replacements,
  alreadyAdded: Set<unknown>
) {
  // For this single decl, we don't want to do individual replacements
  // unless there are leftovers.

  const skipCleanup =
    renamesForPackage.every((a) => a.toFileOrModule != undefined) &&
    bulkRemoveMaybe(renamesForPackage, decl, replacements);

  const maybeNamespaceIdentifier = getNamespaceIdentifier(decl);
  if (maybeNamespaceIdentifier) {
    accumulateRenamesForImportedIdentifier(
      maybeNamespaceIdentifier,
      prependRenames(renamesForPackage, maybeNamespaceIdentifier),
      replacements,
      skipCleanup
    );
  }

  for (const spec of getNamedSpecifiers(decl)) {
    accumulateRenamesForImportedIdentifier(
      spec.getAliasNode() ?? spec.getNameNode(),
      renamesForPackage,
      replacements,
      skipCleanup,
      alreadyAdded,
      spec
    );
  }
}

function bulkRemoveMaybe(
  renamesForPackage: PackageExportRename[],
  decl: ImportDeclaration | ExportDeclaration,
  replacements: Replacements
) {
  const toRename = getFirstWordsAsSet(renamesForPackage);
  const removeAllNamed = getNamedSpecifiers(decl).every((a) => toRename.has(a.getName()));
  if (!removeAllNamed) return false;

  if (getNamedSpecifiers(decl).length == 0) return false;

  if (decl.isKind(SyntaxKind.ImportDeclaration)) {
    const importNamedBindings = decl
      .getImportClauseOrThrow()
      .getNamedBindingsOrThrow()
      .asKindOrThrow(SyntaxKind.NamedImports);

    if (decl.getDefaultImport()) {
      replacements.deleteNode(importNamedBindings);
      const comma = importNamedBindings.getPreviousSiblingIfKindOrThrow(SyntaxKind.CommaToken);
      replacements.deleteNode(comma);
      return true;
    }
  }

  // Otherwise there are named elements and nothing else, import or export
  replacements.deleteNode(decl);
  return true;
}

function prependRenames(
  renamesForPackage: PackageExportRename[],
  maybeNamepsaceImport: Identifier | NamespaceExport
) {
  return renamesForPackage.map<PackageExportRename>(
    (a) =>
      ({
        from: [maybeNamepsaceImport.getText(), ...a.from],
        to: a.to ? [maybeNamepsaceImport.getText(), ...a.to] : undefined,
        toFileOrModule: a.toFileOrModule,
      } as PackageExportRename)
  );
}

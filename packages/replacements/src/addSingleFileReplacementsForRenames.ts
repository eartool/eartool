import type { PackageName } from "@eartool/utils";
import type {
  ExportDeclaration,
  Identifier,
  ImportDeclaration,
  NamespaceExport,
  SourceFile,
} from "ts-morph";
import type { PackageExportRename, PackageExportRenames } from "./PackageExportRename.js";
import type { Replacements } from "./Replacements.js";
import { getPossibleFileLocations } from "./getPossibleFileLocations.js";
import { accumulateRenamesForImportedIdentifier } from "./accumulateRenamesForImportedIdentifier.js";
import { getNamespaceIdentifier } from "./getNamespaceIdentifier.js";
import { getNamedSpecifiers } from "./getNamedSpecifiers.js";
import type { Logger } from "pino";
import * as path from "node:path";

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
      "Full file path renames:\n%s",
      [...fullFilePathRenames].flatMap(([filePathOrModule, renames]) =>
        renames
          .map((a) => `  - ${filePathOrModule}: ${a.from} to package ${a.toFileOrModule}`)
          .join("\n")
      )
    );
  } else {
    logger.debug("Full file path renames: NONE");
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
        accumulateRenamesForAllNamed(decl, renamesForPackage, replacements, alreadyAdded);
        accumulateRenamesForNamespaceIfNeeded(decl, renamesForPackage, replacements);
      }
    }

    const renamesForPackage = renames.get(moduleSpecifier.getLiteralText());
    if (!renamesForPackage) continue;

    accumulateRenamesForAllNamed(decl, renamesForPackage, replacements, alreadyAdded);
    accumulateRenamesForNamespaceIfNeeded(decl, renamesForPackage, replacements);
  }
}

function accumulateRenamesForNamespaceIfNeeded(
  decl: ImportDeclaration | ExportDeclaration,
  renamesForPackage: PackageExportRename[],
  replacements: Replacements
) {
  const maybeNamespaceIdentifier = getNamespaceIdentifier(decl);
  if (maybeNamespaceIdentifier) {
    accumulateRenamesForImportedIdentifier(
      maybeNamespaceIdentifier,
      prependRenames(renamesForPackage, maybeNamespaceIdentifier),
      replacements
    );
  }
}

function accumulateRenamesForAllNamed(
  decl: ImportDeclaration | ExportDeclaration,
  renamesForPackage: PackageExportRename[],
  replacements: Replacements,
  alreadyAdded: Set<unknown>
) {
  for (const spec of getNamedSpecifiers(decl)) {
    accumulateRenamesForImportedIdentifier(
      spec.getAliasNode() ?? spec.getNameNode(),
      renamesForPackage,
      replacements,
      alreadyAdded,
      spec
    );
  }
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

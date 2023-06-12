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

export function addSingleFileReplacementsForRenames(
  sf: SourceFile,
  renames: PackageExportRenames,
  replacements: Replacements,
  logger: Logger,
  dryRun: boolean
) {
  const alreadyAdded = new Set();

  const fullFilePathRenames = new Map(
    [...renames].filter(([packageName]) => packageName.startsWith("/"))
  );
  logger.debug("TOP OF FILE %s", sf.getFilePath());
  logger.debug(
    "Full file path renames:\n%s",
    [...fullFilePathRenames].flatMap(([filePathOrModule, renames]) =>
      renames
        .map((a) => `  - ${filePathOrModule}: ${a.from} to package ${a.toFileOrModule}`)
        .join("\n")
    )
  );

  accumulateRenamesForAllDecls(
    sf.getImportDeclarations(),
    fullFilePathRenames,
    sf,
    replacements,
    alreadyAdded,
    renames,
    logger
  );
  accumulateRenamesForAllDecls(
    sf.getExportDeclarations(),
    fullFilePathRenames,
    sf,
    replacements,
    alreadyAdded,
    renames,
    logger
  );
}

function accumulateRenamesForAllDecls(
  decls: ImportDeclaration[] | ExportDeclaration[],
  fullFilePathRenames: PackageExportRenames,
  sf: SourceFile,
  replacements: Replacements,
  alreadyAdded: Set<unknown>,
  renames: PackageExportRenames,
  logger: Logger
) {
  for (const decl of decls) {
    const moduleSpecifier = decl.getModuleSpecifierValue();
    if (!moduleSpecifier) continue;

    const possibleLocations = getPossibleFileLocations(sf.getProject(), moduleSpecifier);
    // logger.debug("possibel locations: %s", possibleLocations.join(" : "));

    // deal with full file path renames specially
    for (const [fullPathToRename, renamesForPackage] of fullFilePathRenames) {
      logger.debug("QQQQ %s", fullPathToRename);
      const q = possibleLocations.some((l) => l == fullPathToRename);
      if (!q) continue;

      // const refinedRenames: PackageExportRename[] = [...renamesForPackage, {}];

      accumulateRenamesForAllNamed(decl, renamesForPackage, replacements, alreadyAdded);
      accumulateRenamesForNamespaceIfNeeded(decl, renamesForPackage, replacements);
      // gotta deal with the namespace too
    }

    // console.log(getSimplifiedNodeInfoAsString(decl));
    const renamesForPackage = renames.get(moduleSpecifier);
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

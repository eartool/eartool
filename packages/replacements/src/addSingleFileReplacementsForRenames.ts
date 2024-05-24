import type { PackageContext } from "@eartool/utils";
import {
  findEntireQualifiedNameTree,
  getDefaultIdentifier,
  getNamedSpecifiers,
  getNamespaceIdentifier,
  getPossibleFileLocations,
} from "@eartool/utils";
import { filter, flatMap, pipe } from "iter-ops";
import type {
  ExportDeclaration,
  ExportSpecifier,
  Identifier,
  ImportDeclaration,
  ImportSpecifier,
  NamespaceExport,
  Node,
  SourceFile,
} from "ts-morph";
import { addImportOrExport } from "./accumulateRenamesForImportedIdentifier.js";
import type { PackageExportRename, PackageExportRenames } from "./PackageExportRename.js";
import type { Replacements } from "./Replacements.js";

// FIXME: This function is way too complex now because I tried to reuse the
// renames structure for the full file path support to deal with moved files
// leaving the current package and going elsewhere and needing to update
// the other files in that package. I regret this and will need to fix this.
export function addSingleFileReplacementsForRenames(
  ctx: PackageContext,
  sf: SourceFile,
  renames: PackageExportRenames,
  replacements: Replacements,
  dryRun: boolean,
  mode: "full" | "imports" | "exports" = "full",
) {
  const { logger } = ctx;
  // Keep this separated out so we can use conditional break points
  const filename = sf.getFilePath();

  const fullFilePathRenames = new Map(
    [...renames].filter(([packageName]) => packageName.startsWith("/")),
  );
  logger.debug("TOP OF FILE %s", filename);
  if (fullFilePathRenames.size > 0) {
    logger.debug(
      "addSingleFileReplacementsForRenames(): Full file path renames:\n%s",
      [...fullFilePathRenames].flatMap(([filePathOrModule, renames]) =>
        renames
          .map((a) => `  - ${filePathOrModule}: ${a.from} to package ${a.toFileOrModule}`)
          .join("\n"),
      ),
    );
  } else {
    logger.debug("addSingleFileReplacementsForRenames(): Full file path renames: NONE");
  }

  logger.debug("mode: %s", mode);

  if (mode === "full" || mode === "imports") {
    const importDecls = sf.getImportDeclarations();
    accumulateRenamesForAllDecls(ctx, importDecls, fullFilePathRenames, replacements, renames);
  }

  if (mode === "full" || mode === "exports") {
    const decls = sf.getExportDeclarations();
    accumulateRenamesForAllDecls(ctx, decls, fullFilePathRenames, replacements, renames);
  }
}

function accumulateRenamesForAllDecls(
  ctx: PackageContext,
  decls: ImportDeclaration[] | ExportDeclaration[],
  fullFilePathRenames: PackageExportRenames,
  replacements: Replacements,
  renames: PackageExportRenames,
) {
  for (const decl of decls) {
    const moduleSpecifier = decl.getModuleSpecifier();
    if (!moduleSpecifier) continue;

    const possibleLocations = getPossibleFileLocations(ctx, decl);

    // deal with full file path renames specially
    for (const [fullPathToRename, renamesForPackage] of fullFilePathRenames) {
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
      accumulateRenamesForDecl(ctx, decl, renamesForPackage, replacements);
    }

    const renamesForPackage = renames.get(moduleSpecifier.getLiteralText());
    if (!renamesForPackage) continue;

    accumulateRenamesForDecl(ctx, decl, renamesForPackage, replacements);
  }
}

// This is called once per declaration per file.
function accumulateRenamesForDecl(
  ctx: PackageContext,
  decl: ImportDeclaration | ExportDeclaration,
  renamesForPackage: PackageExportRename[],
  replacements: Replacements,
) {
  // {
  const maybeNamespaceIdentifier = getNamespaceIdentifier(decl);
  if (maybeNamespaceIdentifier) {
    let found;
    for (const { fullyQualifiedInstance, packageExportRename } of getFullyQualifiedReferences(
      maybeNamespaceIdentifier,
      prependRenames(renamesForPackage, maybeNamespaceIdentifier),
    )) {
      found = packageExportRename; // only one in this case
      if (packageExportRename.to) {
        const fullReplacement = packageExportRename.to.join(".");
        replacements.replaceNode(fullyQualifiedInstance, fullReplacement);
      }
    }

    // TODO HANDLE DEFAULT
    if (getDefaultIdentifier(decl)) throw new Error("OOops");

    if (found && found.toFileOrModule) {
      replacements.replaceNode(decl.getModuleSpecifier()!, `"${found.toFileOrModule}"`);
    }
  }

  const toMigrate: [ImportSpecifier | ExportSpecifier, string | undefined, string][] = [];
  for (const spec of getNamedSpecifiers(decl)) {
    for (const { fullyQualifiedInstance, packageExportRename } of getFullyQualifiedReferences(
      spec.getAliasNode() ?? spec.getNameNode(),
      renamesForPackage,
    )) {
      if (packageExportRename.to) {
        const fullReplacement = packageExportRename.to.join(".");
        replacements.replaceNode(fullyQualifiedInstance, fullReplacement);
      }
    }
  }

  for (const spec of getNamedSpecifiers(decl)) {
    const matches = renamesForPackage.filter(
      (a) => a.from && a.from[0] === (spec.getAliasNode() ?? spec.getNameNode()).getText(),
    );

    if (matches.length > 0) {
      const expectedTo = matches[0].toFileOrModule;
      const allMatch = matches.every((a) => a.toFileOrModule === expectedTo);
      if (!allMatch) {
        throw new Error("We don't support moving a file import to multiple locations!");
      }

      toMigrate.push([
        spec,
        matches.map((a) => a.to?.[0] ?? a.from[0]).join(", "),
        expectedTo ?? decl.getModuleSpecifierValue()!,
      ]);
    }
  }

  if (
    toMigrate.length === getNamedSpecifiers(decl).length &&
    toMigrate.length > 0 &&
    !getDefaultIdentifier(decl)
  ) {
    // this will break when there are different destinations
    if (decl.getModuleSpecifier()?.getLiteralText() != toMigrate[0][2]) {
      replacements.replaceNode(decl.getModuleSpecifier()!, `"${toMigrate[0][2]}"`);
    }
    for (const [spec, newName] of toMigrate) {
      if (newName) {
        replacements.replaceNode(spec.getAliasNode() ?? spec.getNameNode(), newName);
      }
    }
  } else {
    for (const [specifier, newSymbolName, newSpecifier] of toMigrate) {
      addImportOrExport(replacements, specifier, newSymbolName, newSpecifier, true);
    }
  }
}

function getFullyQualifiedReferences(
  maybeNamespaceIdentifier: Identifier,
  renamesToFind: PackageExportRename[],
) {
  return pipe(
    maybeNamespaceIdentifier.findReferencesAsNodes(),
    filter<Node>(notEqualTo(maybeNamespaceIdentifier)),
    filter(sameSourceFile(maybeNamespaceIdentifier)),
    flatMap((refNode) =>
      pipe(
        renamesToFind,
        flatMap((packageExportRename) => {
          const fullyQualifiedInstance = findEntireQualifiedNameTree(
            refNode,
            packageExportRename.from,
          );

          return fullyQualifiedInstance
            ? [{ fullyQualifiedInstance, packageExportRename, refNode }]
            : [];
        }),
      ),
    ),
  );
}

function sameSourceFile(maybeNamespaceIdentifier: Node) {
  return (refNode: Node) => refNode.getSourceFile() === maybeNamespaceIdentifier.getSourceFile();
}

function notEqualTo(maybeNamespaceIdentifier: Node) {
  return (refNode: Node): refNode is Node => refNode !== maybeNamespaceIdentifier;
}

function prependRenames(
  renamesForPackage: PackageExportRename[],
  maybeNamespaceImport: Identifier | NamespaceExport,
) {
  return renamesForPackage.map<PackageExportRename>(
    (a) =>
      ({
        from: [maybeNamespaceImport.getText(), ...a.from],
        to: a.to ? [maybeNamespaceImport.getText(), ...a.to] : undefined,
        toFileOrModule: a.toFileOrModule,
      }) as PackageExportRename,
  );
}

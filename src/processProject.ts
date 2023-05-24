import { Node, SyntaxKind, type Project, type SourceFile, NamedImports } from "ts-morph";
import { calculateNamespaceRemovals } from "./calculateNamespaceRemovals.js";
import type { Logger } from "pino";
import { ProjectContext } from "./Context.js";
import { processReplacements } from "./replacements/processReplacements.js";
import { dropDtsFiles } from "./utils/tsmorph/dropDtsFiles.js";
import { organizeImportsOnFiles } from "./utils/tsmorph/organizeImportsOnFiles.js";
import type { PackageExportRename } from "./replacements/PackageExportRename.js";
import type { PackageName } from "./PackageName.js";
import { addSingleFileReplacementsForRenames } from "./replacements/addSingleFileReplacementsForRenames.js";
import type { Replacement } from "./replacements/Replacement.js";
import * as Assert from "assert";
import { ReplacementsWrapper } from "./ReplacementsWrapper.js";
import type { Replacements } from "./replacements/Replacements.js";
import { isNamespaceLike } from "./utils/tsmorph/isNamespaceLike.js";
import { isAnyOf } from "@reduxjs/toolkit";

export interface Status {
  totalWorkUnits: number;
  completedWorkUnits: number;
  stage: "analyzing" | "writing" | "organizing";
}

export interface ProcessProjectOpts {
  dryRun?: boolean;
  logger: Logger;
  removeNamespaces: boolean;
  updateState?: (data: Status) => void;
  additionalRenames?: Map<PackageName, PackageExportRename[]>;
}

export async function processProject(
  project: Project,
  {
    dryRun = false,
    logger,
    updateState = (_data) => undefined,
    additionalRenames,
    removeNamespaces,
  }: ProcessProjectOpts
) {
  dropDtsFiles(project);
  const context = new ProjectContext(project, logger);
  const totalFiles = project.getSourceFiles().length;
  // Three stages:
  // * analyzing:
  //   * if `removeNamespaces`: add `totalFiles`
  //   * if `additionalRenames`: add `totalFiles`
  // * organizing `[...changedFiles].length` work.
  // * writing  `[]
  function calculateTotalWorkUnits(changedFilesCount: number) {
    return (
      (removeNamespaces ? totalFiles : 0) +
      (additionalRenames ? totalFiles : 0) +
      (dryRun ? 0 : changedFilesCount) +
      changedFilesCount
    );
  }

  // Assume all files change for now
  let totalWorkUnits = calculateTotalWorkUnits(totalFiles);

  let completedWorkUnits = 0;
  // TODO: Rename totalFiles here to totalWorkUnits or similar
  updateState({ totalWorkUnits, completedWorkUnits, stage: "analyzing" });

  logger.debug("Running with opts %o", {
    dryRun,
    removeNamespaces,
    additionalRenames: [...(additionalRenames?.entries() ?? [])],
  });

  for (const sf of project.getSourceFiles()) {
    if (removeNamespaces) {
      calculateNamespaceRemovals(sf, context);
      completedWorkUnits++;
      updateState({ totalWorkUnits, completedWorkUnits, stage: "analyzing" });
    }

    const replacements = new ReplacementsWrapper(context);
    calculateNamespaceLikeRemovals(sf, replacements);

    if (additionalRenames) {
      const replacements: Replacement[] = [];
      addSingleFileReplacementsForRenames(sf, additionalRenames, replacements, logger);
      for (const r of replacements) {
        context.addReplacement(r);
      }
      completedWorkUnits++;
      updateState({ totalWorkUnits, completedWorkUnits, stage: "analyzing" });
    }
  }

  // actually updates files in project!
  const changedFiles = [...processReplacements(project, context.getReplacements())];
  totalWorkUnits = calculateTotalWorkUnits(changedFiles.length);

  logger.debug("Organizing imports");
  updateState({ totalWorkUnits, completedWorkUnits, stage: "organizing" });
  organizeImportsOnFiles(project, changedFiles);

  completedWorkUnits += changedFiles.length; // TODO make this granular?
  updateState({ totalWorkUnits, completedWorkUnits, stage: "writing" });

  if (dryRun) {
    logger.info("DRY RUN");
  } else {
    logger.info("Saving");
    await project.save();
    completedWorkUnits += changedFiles.length; // TODO make this granular?
    updateState({ totalWorkUnits, completedWorkUnits, stage: "writing" });
  }

  return {
    exportedRenames: context.getRecordedRenames(),
  };
}

export function getFilePath(filePath: string | Node) {
  return typeof filePath == "string" ? filePath : filePath.getSourceFile().getFilePath();
}

function calculateNamespaceLikeRemovals(sf: SourceFile, replacements: Replacements) {
  // TODO: Only perform task if its the only export
  // TODO: Should we check the filename too?
  // TODO: Check for collisions?

  for (const statement of sf.getStatements()) {
    if (!isNamespaceLike(statement)) continue;
    const varDecl = statement.getDeclarations()[0];

    const visitedSpecifiers = new Set();
    for (const refIdentifier of varDecl.findReferencesAsNodes()) {
      // alias import nodes show up twice for some reason
      // so we need to account for that

      const specifier = refIdentifier.getParentIf(
        isAnyOf(Node.isExportSpecifier, Node.isImportSpecifier)
      );
      if (!specifier) continue;
      if (visitedSpecifiers.has(specifier)) continue;

      const named = specifier.getParentIfOrThrow(isAnyOf(Node.isNamedExports, Node.isNamedImports));
      Assert.ok(named.getElements().length == 1);
      const varName = (specifier.getAliasNode() ?? specifier.getNameNode()).getText();
      replacements.replaceNode(named, `* as ${varName}`);
      visitedSpecifiers.add(specifier);
    }

    const syntaxList = varDecl.getInitializer().getExpression().getChildSyntaxList()!;

    // Drop `export const Name = {`
    replacements.remove(sf, statement.getStart(), syntaxList.getFullStart());

    // drop `} as const;`
    const closeBrace = syntaxList.getNextSiblingIfKindOrThrow(SyntaxKind.CloseBraceToken);
    replacements.remove(sf, closeBrace.getStart(), statement.getEnd());

    for (const q of varDecl.getInitializer().getExpression().getProperties()) {
      if (Node.isMethodDeclaration(q)) {
        replacements.insertBefore(q, "export function ");
      } else {
        replacements.addReplacement(
          sf,
          q.getStart(),
          q.getFirstChildByKindOrThrow(SyntaxKind.ColonToken).getEnd(),
          `export const ${q.getName()} = `
        );
      }
      replacements.removeNextSiblingIfComma(q);
    }
  }
}

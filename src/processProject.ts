import type {
  ObjectLiteralExpression,
  VariableStatement,
  VariableDeclaration,
  AsExpression,
  PropertyAssignment,
  MethodDeclaration,
  Expression,
  ArrowFunction,
} from "ts-morph";
import { Node, SyntaxKind, type Project, type SourceFile } from "ts-morph";
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

    for (const refIdentifier of varDecl.findReferencesAsNodes()) {
      const namedExports = refIdentifier
        .getParentIfKind(SyntaxKind.ExportSpecifier)
        ?.getParentIfKind(SyntaxKind.NamedExports);
      if (!namedExports) continue;
      Assert.ok(namedExports.getElements().length == 1);

      replacements.replaceNode(namedExports, `* as ${varDecl.getName()}`);
    }

    const syntaxList = varDecl.getInitializer().getExpression().getChildSyntaxList()!;
    syntaxList.getPreviousSiblingIfKindOrThrow(SyntaxKind.OpenBraceToken);

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

type MaybeReturnType<T, K extends keyof T> = T[K] extends (...args: any[]) => infer R ? R : never;

type Replace<T extends {}, K extends keyof T, V extends MaybeReturnType<T, K>> = Omit<T, K> & {
  [k in K]: () => V;
};

interface TypedPropertyAssignment<Initializer extends Expression> extends PropertyAssignment {
  getInitializer: () => Initializer;
}

// type ArrowFunctionPropertyAssignment = Replace<PropertyAssignment, "getInitializer", ArrowFunction>;

type ObjectLiteralWithMethodLikeOnly = Replace<
  ObjectLiteralExpression,
  "getProperties",
  (MethodDeclaration | TypedPropertyAssignment<ArrowFunction>)[]
>;

function isNamespaceLike(
  node: Node
): node is Replace<
  VariableStatement,
  "getDeclarations",
  Replace<
    VariableDeclaration,
    "getInitializer",
    Replace<AsExpression, "getExpression", ObjectLiteralWithMethodLikeOnly>
  >[]
> {
  if (!Node.isVariableStatement(node)) return false;

  if (node.getDeclarations().length != 1) return false;
  const varDecl = node.getDeclarations()[0];
  // varDecl.getName();

  const asExpression = varDecl.getInitializerIfKind(SyntaxKind.AsExpression);
  if (!asExpression) return false;

  const typeRef = asExpression.getTypeNode()?.asKind(SyntaxKind.TypeReference);
  if (!typeRef || typeRef.getText() != "const") return false;

  const objLiteral = asExpression.getExpressionIfKind(SyntaxKind.ObjectLiteralExpression);
  if (!objLiteral) return false;

  const methodsOnly = objLiteral.getProperties().every((a) => {
    if (Node.isMethodDeclaration(a)) return true;
    if (!Node.isPropertyAssignment(a)) return false;

    return a.getInitializerIfKind(SyntaxKind.ArrowFunction) != null;
  });
  if (!methodsOnly) return false;

  return true;
}

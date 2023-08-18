import type { ExportDeclaration } from "ts-morph";
import { Node, SyntaxKind } from "ts-morph";
import type { NamespaceContext } from "@eartool/replacements";
import {
  findFileLocationForImportExport,
  getSimplifiedNodeInfoAsString,
  isRootExport,
} from "@eartool/utils";
import { getNewName } from "./getNewName.js";

export function renameExports(context: NamespaceContext) {
  const { namespaceDecl, logger, namespaceName } = context;
  logger.trace(
    "renameExports(%s) for %d references",
    namespaceName,
    namespaceDecl.findReferencesAsNodes().length
  );

  const hasMultipleDeclarations = namespaceDecl.getSymbol()?.getDeclarations().length != 1;

  for (const refNode of namespaceDecl.findReferencesAsNodes()) {
    const exportDecl = refNode.getFirstAncestorByKind(SyntaxKind.ExportDeclaration);

    if (exportDecl) {
      const twinIsType = !!namespaceDecl
        .getParent()
        .forEachChild(
          (n) =>
            Node.hasName(n) &&
            n.getName() === namespaceDecl.getName() &&
            (n.isKind(SyntaxKind.InterfaceDeclaration) || n.isKind(SyntaxKind.TypeAliasDeclaration))
        );

      processSingleExport(refNode, exportDecl, context, hasMultipleDeclarations, twinIsType);
    }
  }
}

function processSingleExport(
  refNode: Node,
  exportDecl: ExportDeclaration,
  context: NamespaceContext, // TODO rename this namespaceCtx
  hasMultipleDeclarations: boolean,
  twinIsType: boolean
) {
  const { renames, logger, namespaceName } = context;

  const moduleSpecifier = exportDecl.getModuleSpecifier()?.getText();
  const startOfExport = exportDecl.getStart();
  if (moduleSpecifier == null) {
    logger.warn(
      "Couldn't find module specifier for export. Ignoring edge case and moving on. %s",
      getSimplifiedNodeInfoAsString(exportDecl)
    );
    return;
  }
  // Assert.ok(
  //   moduleSpecifier != null,
  //   "Invariant failed. How is this not a module specifier? " +
  //     getSimplifiedNodeInfoAsString(exportDecl)
  // );

  const isOneStepAway =
    findFileLocationForImportExport(context, exportDecl) === context.targetSourceFile.getFilePath();

  logger.trace("Found '%s' in %s", exportDecl.print(), getSimplifiedNodeInfoAsString(exportDecl));

  const filePath = exportDecl.getSourceFile().getFilePath();
  for (const [oldName, details] of renames) {
    if (details.type) {
      processTypeOrVariable(oldName, true, details.type.exported);
    }

    if (details.concrete) {
      processTypeOrVariable(oldName, false, details.concrete.exported);
    }
  }

  if (!hasMultipleDeclarations) {
    context.addReplacement({
      start: refNode.getStart(),
      end: refNode.getEnd(),
      filePath,
      newValue: "",
    });
  } else if (twinIsType) {
    // We only want to do this if its not already a type export!
    if (!exportDecl.isTypeOnly()) {
      context.addReplacement({
        start: refNode.getStart(),
        end: refNode.getStart(),
        filePath,
        newValue: `type `,
      });
    }
  }

  function processTypeOrVariable(oldName: string, isType: boolean, exported: boolean) {
    const { localName, importName } = getNewName(oldName, namespaceName);
    const n = () => {
      if (!isOneStepAway) return importName;
      return localName === importName ? localName : `${localName} as ${importName}`;
    };

    // we only want to add the export if it doesn't have a twin
    if (!renames.get(oldName)!.concrete || !isType) {
      // FIXME this logic is going to be brittle
      if (exported) {
        if (isRootExport(exportDecl.getSourceFile())) {
          // TODO Rename this to be clearer
          context.recordRename([context.namespaceName, oldName], [importName]);
        }

        context.addReplacement({
          start: startOfExport,
          end: startOfExport,
          filePath,
          newValue: `export { ${isType ? "type" : ""} ${n()} } from ${moduleSpecifier};`,
        });
      }
    }
  }
}

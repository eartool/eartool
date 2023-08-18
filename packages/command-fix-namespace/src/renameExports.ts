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

  const namespaceHasTwin = namespaceDecl.getSymbol()?.getDeclarations().length != 1;

  for (const refNode of namespaceDecl.findReferencesAsNodes()) {
    const exportDecl = refNode.getFirstAncestorByKind(SyntaxKind.ExportDeclaration);

    if (exportDecl) {
      const namespacesTwinIsType = !!namespaceDecl
        .getParent()
        .forEachChild(
          (n) =>
            Node.hasName(n) &&
            n.getName() === namespaceDecl.getName() &&
            (n.isKind(SyntaxKind.InterfaceDeclaration) || n.isKind(SyntaxKind.TypeAliasDeclaration))
        );

      processSingleExport(refNode, exportDecl, context, namespaceHasTwin, namespacesTwinIsType);
    }
  }
}

function processSingleExport(
  refNode: Node,
  exportDecl: ExportDeclaration,
  namespaceCtx: NamespaceContext,
  namespaceHasTwin: boolean,
  namespacesTwinIsType: boolean
) {
  const { renames, logger, namespaceName } = namespaceCtx;

  const moduleSpecifier = exportDecl.getModuleSpecifier()?.getText();
  const startOfExport = exportDecl.getStart();
  if (moduleSpecifier == null) {
    logger.warn(
      "Couldn't find module specifier for export. Ignoring edge case and moving on. %s",
      getSimplifiedNodeInfoAsString(exportDecl)
    );
    return;
  }

  const isOneStepAway =
    findFileLocationForImportExport(namespaceCtx, exportDecl) ===
    namespaceCtx.targetSourceFile.getFilePath();

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

  if (!namespaceHasTwin) {
    namespaceCtx.addReplacement({
      start: refNode.getStart(),
      end: refNode.getEnd(),
      filePath,
      newValue: "",
    });
  } else if (namespacesTwinIsType) {
    // We only want to do this if its not already a type export!
    if (!exportDecl.isTypeOnly()) {
      namespaceCtx.addReplacement({
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
          namespaceCtx.recordRename([namespaceCtx.namespaceName, oldName], [importName]);
        }

        namespaceCtx.addReplacement({
          start: startOfExport,
          end: startOfExport,
          filePath,
          newValue: `export { ${isType ? "type" : ""} ${n()} } from ${moduleSpecifier};`,
        });
      }
    }
  }
}

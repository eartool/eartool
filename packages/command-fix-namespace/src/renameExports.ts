import type { ExportDeclaration } from "ts-morph";
import { Node, SyntaxKind } from "ts-morph";
import type { NamespaceContext } from "@eartool/replacements";
import {
  findFileLocationForImportExport,
  getAllImportsAndExports,
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
    // `import { Foo as Bar } ...` has two refs to `Foo`, one for `Foo` and one for `Bar`.
    // We only need to calculate the renames for the one
    // An alternative would be to make sure we only visit the exportDecl once and may be required
    // if this has consequences i cant see yet.
    if (refNode.getText() !== context.namespaceName) continue;

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

  const importsAndExports = getAllImportsAndExports(context.projectContext);

  for (const [filePath, metadata] of importsAndExports) {
    if (!isRootExport(context.project.getSourceFile(filePath)!)) continue;

    for (const [oldName] of context.renames) {
      const { localName } = getNewName(oldName, namespaceName);

      for (const [, exportInfo] of metadata.exports) {
        if (
          exportInfo.type === "alias" &&
          exportInfo.indirect &&
          exportInfo.targetName === namespaceName
        ) {
          const parts = exportInfo.name.split(".");
          context.recordRename([...parts, oldName], [...parts.slice(0, -1), localName]);
        }
      }
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
    // console.log({ oldName, isType, exported });
    const { localName, importName } = getNewName(oldName, namespaceName);
    const n = () => {
      if (!isOneStepAway) return importName;
      return localName === importName ? localName : `${localName} as ${importName}`;
    };

    // we only want to add the export if it doesn't have a twin
    if (!renames.get(oldName)!.concrete || !isType) {
      if (exported) {
        if (isRootExport(exportDecl.getSourceFile())) {
          // TODO Rename this to be clearer
          // console.log("Record rename", [namespaceCtx.namespaceName, oldName], [importName]);
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

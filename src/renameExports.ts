import type { ExportDeclaration, Node } from "ts-morph";
import { SyntaxKind } from "ts-morph";
import type { NamespaceContext } from "./Context.js";
import { getNewName } from "./getNewName.js";
import * as Assert from "node:assert";

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
      processSingleExport(refNode, exportDecl, context, hasMultipleDeclarations);
    }
  }
}

function processSingleExport(
  refNode: Node,
  exportDecl: ExportDeclaration,
  context: NamespaceContext,
  hasMultipleDeclarations: boolean
) {
  const { typeRenames, concreteRenames, logger, namespaceName } = context;

  const moduleSpecifier = exportDecl.getModuleSpecifier()?.getText();
  const startOfExport = exportDecl.getStart();
  Assert.ok(moduleSpecifier != null);

  logger.trace("Found '%s' in %s", exportDecl.print(), exportDecl);

  const filePath = exportDecl.getSourceFile().getFilePath();
  for (const oldName of typeRenames) {
    processVariable(oldName, true);
  }

  for (const oldName of concreteRenames) {
    processVariable(oldName, false);
  }

  if (!hasMultipleDeclarations) {
    context.addReplacement({
      start: refNode.getStart(),
      end: refNode.getEnd(),
      filePath,
      newValue: "",
    });
  }

  function processVariable(oldName: string, isType: boolean) {
    const { localName, importName } = getNewName(oldName, namespaceName);
    const n = () => (localName === importName ? localName : `${localName} as ${importName}`);

    context.addReplacement({
      start: startOfExport,
      end: startOfExport,
      filePath,
      newValue: `export { ${isType ? "type" : ""} ${n()} } from ${moduleSpecifier};`,
    });
  }
}

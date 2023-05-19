import { SyntaxKind } from "ts-morph";
import type { NamespaceContext } from "./Context.js";
import { getNewName } from "./getNewName.js";

export function renameExports(context: NamespaceContext) {
  const { namespaceDecl, typeRenames, concreteRenames, logger, namespaceName } = context;
  logger.trace(
    "renameExports(%s) for %d references",
    namespaceName,
    namespaceDecl.findReferencesAsNodes().length
  );

  const hasMultipleDeclarations = namespaceDecl.getSymbol()?.getDeclarations().length != 1;

  for (const refNode of namespaceDecl.findReferencesAsNodes()) {
    const exportDecl = refNode.getFirstAncestorByKind(SyntaxKind.ExportDeclaration);

    if (exportDecl) {
      logger.trace("Found %s in %s", exportDecl.print(), exportDecl);

      const filePath = exportDecl.getSourceFile().getFilePath();
      for (const oldName of typeRenames) {
        const { localName, importName } = getNewName(oldName, namespaceName);

        const n = () => (localName === importName ? localName : `${localName} as ${importName}`);

        context.addReplacement({
          start: 0,
          end: 0,
          filePath,
          newValue: `export { type ${n()} } from ${exportDecl.getModuleSpecifier()?.getText()};`,
        });
      }

      for (const oldName of concreteRenames) {
        const { localName, importName } = getNewName(oldName, namespaceName);
        const n = () => (localName === importName ? localName : `${localName} as ${importName}`);
        context.addReplacement({
          start: 0,
          end: 0,
          filePath,
          newValue: `export { ${n()} } from ${exportDecl.getModuleSpecifier()?.getText()};`,
        });
      }

      if (!hasMultipleDeclarations) {
        exportDecl;
        context.addReplacement({
          start: refNode.getStart(),
          end: refNode.getEnd(),
          filePath,
          newValue: "",
        });
      }
    } else {
      logger.warn("WTF");
    }
  }
}

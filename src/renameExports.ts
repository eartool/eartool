import { SyntaxKind, type OptionalKind, type ExportSpecifierStructure } from "ts-morph";
import type { Context } from "./Context.js";
import { getNewName } from "./getNewName.js";

export function renameExports({
  namespaceDecl,
  typeRenames,
  concreteRenames,
  logger,
  namespaceName,
}: Context) {
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

      exportDecl.addNamedExports(makeExportSpecifiers(typeRenames, namespaceName, true));
      exportDecl.addNamedExports(makeExportSpecifiers(concreteRenames, namespaceName, false));

      // FIXME can only drop if its the only one
      if (!hasMultipleDeclarations) {
        exportDecl
          .getNamedExports()
          .find((a) => a.getName() === namespaceDecl.getName())
          ?.remove();
      }
    } else {
      logger.warn("WTF");
    }
  }
}

function makeExportSpecifiers(names: Set<string>, namespaceName: string, isTypeOnly: boolean) {
  return Array.from(names).map<OptionalKind<ExportSpecifierStructure>>((name) => {
    const newName = getNewName(name, namespaceName);
    return {
      name: newName.localName,
      alias: newName.importName !== newName.localName ? newName.importName : undefined,
      isTypeOnly,
    };
  });
}

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
  logger.trace("renameExports(%s) for %d references", namespaceName, namespaceDecl.findReferencesAsNodes().length);

  for (const refNode of namespaceDecl.findReferencesAsNodes()) {
    const exportDecl = refNode.getFirstAncestorByKind(SyntaxKind.ExportDeclaration);
    logger.trace(refNode.getParent()?.getKindName());

    if (exportDecl) {
      logger.trace("Found %s in %s", exportDecl.print(), exportDecl);

      exportDecl.addNamedExports(makeExportSpecifiers(typeRenames, namespaceName, true));
      exportDecl.addNamedExports(makeExportSpecifiers(concreteRenames, namespaceName, false));

      // FIXME can only drop if its the only one
      exportDecl
        .getNamedExports()
        .find((a) => a.getName() === namespaceDecl.getName())
        ?.remove();
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

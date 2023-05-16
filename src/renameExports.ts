import { SyntaxKind } from "ts-morph";
import type { Context } from "./Context.js";
import { makeExportSpecifiers } from "./utils/makeExportSpecifiers.js";

export function renameExports({ namespaceDecl, typeRenames, concreteRenames, logger }: Context) {
  for (const refNode of namespaceDecl.findReferencesAsNodes()) {
    const exportDecl = refNode.getFirstAncestorByKind(SyntaxKind.ExportDeclaration);

    if (exportDecl) {
      logger.trace("Found %s in %s", exportDecl.print(), exportDecl);

      exportDecl.addNamedExports(makeExportSpecifiers(typeRenames, true));
      exportDecl.addNamedExports(makeExportSpecifiers(concreteRenames, false));

      // FIXME can only drop if its the only one
      exportDecl
        .getNamedExports()
        .find((a) => a.getName() === namespaceDecl.getName())
        ?.remove();
    }
  }
}

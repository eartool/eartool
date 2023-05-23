import type { ImportSpecifier, SourceFile } from "ts-morph";
import type { PackageExportRename } from "./PackageExportRename.js";
import type { PackageName } from "../PackageName.js";
import type { Replacement } from "./Replacement.js";
import { findEntireQualifiedNameTree } from "../utils/tsmorph/findEntireQualifiedNameTree.js";
import type { Logger } from "pino";
import type { Identifier } from "ts-morph";

export function addSingleFileReplacementsForRenames(
  sf: SourceFile,
  renames: Map<PackageName, PackageExportRename[]>,
  replacements: Replacement[],
  logger: Logger
) {
  const alreadyAdded = new Set();

  for (const importDecl of sf.getImportDeclarations()) {
    try {
      const renamesForPackage = renames.get(importDecl.getModuleSpecifier().getLiteralText());
      if (!renamesForPackage) continue;

      for (const importSpec of importDecl.getNamedImports()) {
        handleImportSpec(importSpec, renamesForPackage);
      }

      const maybeNamepsaceImport = importDecl.getNamespaceImport();
      if (maybeNamepsaceImport) {
        handleNamespaceImport(maybeNamepsaceImport, renamesForPackage);
      }
    } catch (e) {
      logger.fatal(e);
      logger.flush();
      throw e;
    }
  }

  function handleNamespaceImport(
    namespaceImport: Identifier,
    renamesForPackage: PackageExportRename[]
  ) {
    for (const packageExportRename of renamesForPackage) {
      for (const refNode of namespaceImport.findReferencesAsNodes()) {
        if (refNode == namespaceImport) continue;
        const fullyQualifiedInstance = findEntireQualifiedNameTree(refNode, [
          namespaceImport.getText(),
          ...packageExportRename.from,
        ]);
        if (!fullyQualifiedInstance) continue;
        replacements.push({
          start: fullyQualifiedInstance.getStart(),
          end: fullyQualifiedInstance.getEnd(),
          newValue: packageExportRename.to.join("."),
          filePath: refNode.getSourceFile().getFilePath(),
        });
      }
    }
  }

  function handleImportSpec(importSpec: ImportSpecifier, renamesForPackage: PackageExportRename[]) {
    const packageExportRenames = renamesForPackage.filter((q) => q.from[0] == importSpec.getName());

    for (const packageExportRename of packageExportRenames) {
      const nameNode = importSpec.getAliasNode() ?? importSpec.getNameNode();

      const addImport = true;
      for (const refNode of nameNode.findReferencesAsNodes()) {
        if (refNode === nameNode) continue; // I hate this edge case of tsmorph

        const fullyQualifiedInstance = findEntireQualifiedNameTree(
          refNode,
          packageExportRename.from
        );
        if (!fullyQualifiedInstance) continue;

        if (addImport && !alreadyAdded.has(packageExportRename)) {
          alreadyAdded.add(packageExportRename);
          replacements.push({
            start: importSpec.getStart(),
            end: importSpec.getStart(),
            newValue: `${packageExportRename.to[0]},`,
            filePath: refNode.getSourceFile().getFilePath(),
          });
        }

        replacements.push({
          start: fullyQualifiedInstance.getStart(),
          end: fullyQualifiedInstance.getEnd(),
          newValue: packageExportRename.to.join("."),
          filePath: refNode.getSourceFile().getFilePath(),
        });
      }
    }
  }
}

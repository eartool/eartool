import type { Project } from "ts-morph";
import type { PackageExportRename } from "../PackageExportRename.js";
import type { PackageName } from "../PackageName.js";
import type { Replacement } from "./Replacement.js";
import { findEntireQualifiedNameTree } from "../utils/tsmorph/findEntireQualifiedNameTree.js";

// TODO This is going to be reall inefficient
export function calculateReplacementsForRenames(
  project: Project,
  renames: Record<PackageName, PackageExportRename[]>
) {
  const replacements: Replacement[] = [];

  for (const sf of project.getSourceFiles()) {
    const alreadyAdded = new Set();

    for (const importDecl of sf.getImportDeclarations()) {
      const renamesForPackage = renames[importDecl.getModuleSpecifier().getLiteralText()];
      if (!renamesForPackage) continue;

      for (const importSpec of importDecl.getNamedImports()) {
        const packageExportRenames = renamesForPackage.filter(
          (q) => q.from[0] == importSpec.getName()
        );

        for (const packageExportRename of packageExportRenames) {
          const nameNode = importSpec.getAliasNode() ?? importSpec.getNameNode();
          for (const refNode of nameNode.findReferencesAsNodes()) {
            if (refNode === nameNode) continue; // I hate this edge case of tsmorph

            const fullyQualifiedInstance = findEntireQualifiedNameTree(
              refNode,
              packageExportRename.from
            );
            if (!fullyQualifiedInstance) continue;

            if (!alreadyAdded.has(packageExportRename)) {
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
  }
  return replacements;
}

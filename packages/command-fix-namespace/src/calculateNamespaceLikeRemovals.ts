import type { ProjectContext, Replacements } from "@eartool/replacements";
import { getNamespaceLike } from "@eartool/utils";
import { Node, type SourceFile } from "ts-morph";
import { replaceImportsAndExports } from "./replaceImportsAndExports.js";
import { unwrapNamespaceInFile } from "./unwrapNamespaceInFile.js";

export function calculateNamespaceLikeRemovals(
  sf: SourceFile,
  projectContext: ProjectContext,
  replacements: Replacements,
) {
  // TODO: Should we check the filename too?

  const exports = sf.getStatements().filter((s) => {
    if (Node.isExportable(s)) {
      return s.isExported();
    }
    return false;
  });

  if (exports.length > 1) {
    return;
  }

  for (const statement of sf.getStatements()) {
    const namespaceLike = getNamespaceLike(statement);
    if (!namespaceLike) continue;

    // not bothering with this case right now
    // covered by namespacelike check
    // if (statement.getDeclarations().length > 1) continue;

    const varDecl = namespaceLike.varDecl;
    if (!varDecl) continue;

    replaceImportsAndExports(varDecl, replacements, projectContext);
    unwrapNamespaceInFile(varDecl, replacements);
  }
}

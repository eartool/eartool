import { Node, type SourceFile } from "ts-morph";
import type { Replacements } from "@eartool/replacements";
import { isNamespaceLike } from "@eartool/utils";
import { replaceImportsAndExports } from "./replaceImportsAndExports.js";
import { unwrapNamespaceInFile } from "./unwrapNamespaceInFile.js";

export function calculateNamespaceLikeRemovals(sf: SourceFile, replacements: Replacements) {
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
    if (!isNamespaceLike(statement)) continue;

    // not bothering with this case right now
    if (statement.getDeclarations().length > 1) continue;

    const varDecl = statement.getDeclarations()[0];

    replaceImportsAndExports(varDecl, replacements);
    unwrapNamespaceInFile(varDecl, replacements);
  }
}

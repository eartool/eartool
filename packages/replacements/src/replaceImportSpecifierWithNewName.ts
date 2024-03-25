import { SyntaxKind } from "ts-morph";
import type { ImportSpecifier } from "ts-morph";
import type { Replacements } from "./Replacements.js";

/**
 * Replaces the provided import specifier with a new name, respecting aliases
 * @param replacements
 * @param importSpecifier
 * @param newName
 */
export function replaceImportSpecifierWithNewName(
  replacements: Replacements,
  importSpecifier: ImportSpecifier,
  newName: string,
) {
  const aliasNode = importSpecifier.getAliasNode();

  if (aliasNode) {
    replacements.replaceNode(importSpecifier, newName);
  } else {
    const comma = importSpecifier.getNameNode().getNextSiblingIfKind(SyntaxKind.CommaToken);

    const before =
      comma ??
      importSpecifier
        .getParentSyntaxList()!
        .getNextSiblingIfKindOrThrow(SyntaxKind.CloseBraceToken);

    replacements.insertBefore(before, ` as ${newName}`);
  }
}

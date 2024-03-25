import * as Assert from "assert";
import { Node, SyntaxKind } from "ts-morph";
import { findNewNameInScope } from "@eartool/utils";
import type { Replacements } from "./Replacements.js";
import { replaceImportSpecifierWithNewName } from "./replaceImportSpecifierWithNewName.js";
import { addReplacementsForRenamedIdentifier } from "./addReplacementsForRenamedIdentifier.js";
import { autorenameIdentifierAndReferences } from "./autorenameIdentifierAndReferences.js";

export function replaceAllNamesInScope(
  replacements: Replacements,
  scope: Node,
  banNames: Set<string>,
) {
  const logger = replacements.logger.child({
    primaryNode: scope,
    methodName: replaceAllNamesInScope.name,
  });
  for (const local of scope.getLocals()) {
    logger.trace("Considering %s %d", local.getName(), local.getDeclarations().length);
    for (const declaration of local.getDeclarations()) {
      if (Node.isImportSpecifier(declaration)) {
        // e.g. import {} from ...
        const nodeToReplace = declaration.getAliasNode() ?? declaration.getNameNode();

        if (!banNames.has(nodeToReplace.getText())) continue;

        const newName = findNewNameInScope(nodeToReplace.getText(), scope, banNames);
        replaceImportSpecifierWithNewName(replacements, declaration, newName); // update the actual variable
        addReplacementsForRenamedIdentifier(replacements, nodeToReplace, scope, newName);
      } else if (Node.isImportClause(declaration)) {
        // e.g. import foo from
        const nameNode = declaration.getDefaultImport();
        Assert.ok(nameNode != null);

        if (!banNames.has(nameNode.getText())) continue;

        autorenameIdentifierAndReferences(replacements, nameNode, scope, banNames);
      } else if (
        Node.isVariableDeclaration(declaration) ||
        Node.isFunctionDeclaration(declaration) ||
        // e.g. import * as Foo from ...
        Node.isNamespaceImport(declaration) ||
        Node.isNamed(declaration)
      ) {
        const nameNode = declaration.getNameNode()!.asKindOrThrow(SyntaxKind.Identifier);
        if (!banNames.has(nameNode.getText())) continue;

        autorenameIdentifierAndReferences(replacements, nameNode, scope, banNames);
      }
    }
  }
}

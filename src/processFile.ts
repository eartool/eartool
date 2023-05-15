import * as Assert from "assert";
import { Node, SourceFile, SyntaxKind } from "ts-morph";
import { isSafeToRenameAcrossReferences } from "./isSafeToRenameAcrossReferences.js";
import { renameOriginalSymbols } from "./renameOriginalSymbols.js";
import { renameReferences } from "./renameReferences.js";
import { isNamespaceDeclaration } from "./utils/isNamespaceDeclaration.js";


export function processFile(sf: SourceFile) {
  const namespaceDecl = sf.getFirstDescendant(isNamespaceDeclaration);
  if (!namespaceDecl)
    return;

  const namespaceName = namespaceDecl.getName();
  // console.log(
  //   namespaceDecl.getName(),
  //   namespaceDecl.hasNamespaceKeyword(),
  //   namespaceDecl.getDeclarationKind()
  // );
  const syntaxList = namespaceDecl
    .getLastChildByKindOrThrow(SyntaxKind.ModuleBlock)
    .getLastChildByKindOrThrow(SyntaxKind.SyntaxList);

  const symbolsInRootScope = new Set(sf.getLocals().map((a) => a.getName()));

  const toRename = new Set<string>();

  for (const q of syntaxList.getChildren()) {
    if (Node.isVariableStatement(q)) {
      for (const varDecl of q.getDeclarations()) {
        if (symbolsInRootScope.has(varDecl.getName())) {
          // unwrap is going to make this really hard to deal with cause we
          // have figure out which was the old and which is the new so we
          // just bail on this file
          return;
        } else {
          toRename.add(varDecl.getName());
        }
      }
    } else if (Node.isFunctionDeclaration(q) ||
      Node.isClassDeclaration(q) ||
      Node.isInterfaceDeclaration(q)) {
      // Can't have unnamed functions in namespace unless its invoked,
      // but that would be an expression statement so we are okay
      const name = q.getName();
      Assert.ok(name != null, "name was expected");
      toRename.add(name);
    } else if (Node.isInterfaceDeclaration(q)) {
    } else if (Node.isEnumDeclaration(q)) {
    } else {
      console.log(`Unknown kind: ${q.getKindName()}`);
    }
  }

  // if we got here, its safe to know we can rename in file but we don't
  // know what we can do across the rest of the package. lets sanity check
  if (!isSafeToRenameAcrossReferences(toRename, namespaceDecl)) {
    return;
  }

  // if we got here its safe to do our job.
  // find the files that used these old names
  renameReferences(toRename, namespaceDecl);

  // Actually break up the namespace
  namespaceDecl.unwrap();

  // Finally rename locally
  renameOriginalSymbols(toRename, sf, namespaceName);

  // console.log(sf.getFullText());
}

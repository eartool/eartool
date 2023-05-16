import * as Assert from "assert";
import { Node, SourceFile, SyntaxKind } from "ts-morph";
import { isSafeToRenameAcrossReferences } from "./isSafeToRenameAcrossReferences.js";
import { renameOriginalSymbols } from "./renameOriginalSymbols.js";
import { renameReferences } from "./renameReferences.js";
import { isNamespaceDeclaration } from "./utils/isNamespaceDeclaration.js";
import { Logger } from "pino";
import * as path from "node:path";

export function processFile(sf: SourceFile, logger: Logger) {
  const filePath = path.relative(process.cwd(), sf.getFilePath());
  logger.flush();
  logger = logger.child({ filePath });
  logger.debug(`Processing file %s`, filePath);
  const namespaceDecl = sf.getFirstDescendant(isNamespaceDeclaration);
  if (!namespaceDecl) {
    logger.trace("Couldn't find a namespace");
    return;
  }

  const namespaceName = namespaceDecl.getName();
  logger = logger.child({ namespace: namespaceName });
  logger.trace(`Found namespace %s`, namespaceName);
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
    } else if (
      Node.isFunctionDeclaration(q) ||
      Node.isClassDeclaration(q) ||
      Node.isInterfaceDeclaration(q) ||
      Node.isTypeAliasDeclaration(q)
    ) {
      // Can't have unnamed functions in namespace unless its invoked,
      // but that would be an expression statement so we are okay
      const name = q.getName();
      Assert.ok(name != null, "name was expected");
      toRename.add(name);
    } else if (Node.isEnumDeclaration(q)) {
    } else {
      logger.warn("Unknown kind %s", q.getKindName());
    }
  }
  logger.trace("To rename: %s", Array.from(toRename).join(", "));

  // if we got here, its safe to know we can rename in file but we don't
  // know what we can do across the rest of the package. lets sanity check
  if (!isSafeToRenameAcrossReferences(toRename, namespaceDecl, logger)) {
    logger.warn("Aborting");
    return;
  }

  // if we got here its safe to do our job.
  // find the files that used these old names
  renameReferences(toRename, namespaceDecl, logger);

  // Actually break up the namespace
  namespaceDecl.unwrap();

  // Finally rename locally
  renameOriginalSymbols(toRename, sf, namespaceName, logger);

  // logger.trace(sf.getFullText());
}

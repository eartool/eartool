import * as Assert from "assert";
import { Node, type SourceFile, SyntaxKind } from "ts-morph";
import { isSafeToRenameAllAcrossReferences } from "./isSafeToRenameAllAcrossReferences.js";
import { renameAllReferences } from "./renameAllReferences.js";
import { isNamespaceDeclaration } from "./utils/isNamespaceDeclaration.js";
import * as path from "node:path";
import type { ProjectContext } from "./Context.js";
import { renameExports } from "./renameExports.js";

export function processFile(sf: SourceFile, projectContext: ProjectContext) {
  const filePath = path.relative(process.cwd(), sf.getFilePath());
  projectContext.logger.debug(`Processing file %s`, filePath);

  const namespaceDecl = sf.getFirstDescendant(isNamespaceDeclaration);
  if (!namespaceDecl) {
    projectContext.logger.trace("Couldn't find a namespace");
    return;
  }

  const context = projectContext.createNamespaceContext(namespaceDecl);

  const namespaceName = namespaceDecl.getName();
  context.logger.trace(`Found namespace %s`, namespaceName);

  const syntaxList = namespaceDecl
    .getLastChildByKindOrThrow(SyntaxKind.ModuleBlock)
    .getLastChildByKindOrThrow(SyntaxKind.SyntaxList);
  const symbolsInRootScope = new Set(sf.getLocals().map((a) => a.getName()));

  Assert.ok(namespaceDecl.getChildSyntaxList() == syntaxList);
  for (const q of syntaxList.getChildren()) {
    if (Node.isVariableStatement(q)) {
      for (const varDecl of q.getDeclarations()) {
        if (symbolsInRootScope.has(varDecl.getName())) {
          // unwrap is going to make this really hard to deal with cause we
          // have figure out which was the old and which is the new so we
          // just bail on this file
          return;
        } else {
          context.concreteRenames.add(varDecl.getName());
        }
      }
    } else if (Node.isInterfaceDeclaration(q) || Node.isTypeAliasDeclaration(q)) {
      // Can't have unnamed functions in namespace unless its invoked,
      // but that would be an expression statement so we are okay
      const name = q.getName();
      Assert.ok(name != null, "name was expected");
      context.typeRenames.add(name);
    } else if (Node.isFunctionDeclaration(q) || Node.isClassDeclaration(q)) {
      // Can't have unnamed functions in namespace unless its invoked,
      // but that would be an expression statement so we are okay
      const name = q.getName();
      Assert.ok(name != null, "name was expected");
      context.concreteRenames.add(name);
    } else if (Node.isEnumDeclaration(q)) {
      throw new Error("Not implemented"); // FIXME
    } else {
      context.logger.warn("Unknown kind %s", q.getKindName());
    }
  }

  context.logger.trace("Type rename: %s", Array.from(context.typeRenames).join(", "));
  context.logger.trace("Concrete rename: %s", Array.from(context.concreteRenames).join(", "));

  // if we got here, its safe to know we can rename in file but we don't
  // know what we can do across the rest of the package. lets sanity check
  if (!isSafeToRenameAllAcrossReferences(context)) {
    context.logger.warn("Aborting");
    return;
  }

  // if we got here its safe to do our job.
  // find the files that used these old names
  renameAllReferences(context);

  // re exports wont be able to reference the inner bit, just the namespace so we can fix that now
  renameExports(context);

  context.addReplacement({
    start: namespaceDecl.getStart(),
    end: namespaceDecl.getFirstDescendantByKindOrThrow(SyntaxKind.OpenBraceToken).getEnd(),
    filePath: namespaceDecl.getSourceFile().getFilePath(),
    newValue: "",
  });

  context.addReplacement({
    start: namespaceDecl.getDescendantsOfKind(SyntaxKind.CloseBraceToken).at(-1)!.getStart(),
    end: namespaceDecl.getEnd(),
    filePath: namespaceDecl.getSourceFile().getFilePath(),
    newValue: "",
  });
}

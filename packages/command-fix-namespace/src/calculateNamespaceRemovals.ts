import * as path from "node:path";
import * as Assert from "assert";
import { Node, type SourceFile, SyntaxKind } from "ts-morph";
import { isNamespaceDeclaration } from "@eartool/utils";
import type { ProjectContext, Replacements } from "@eartool/replacements";
import { isSafeToRenameAllAcrossReferences } from "./isSafeToRenameAllAcrossReferences.js";
import { renameAllReferences } from "./renameAllReferences.js";
import { renameExports } from "./renameExports.js";
import { replaceImportsAndExports } from "./replaceImportsAndExports.js";
import { unwrapNamespaceInFile } from "./unwrapNamespaceInFile.js";

export function calculateNamespaceRemovals(
  sf: SourceFile,
  projectContext: ProjectContext,
  replacements: Replacements
) {
  const filePath = path.relative(process.cwd(), sf.getFilePath());
  projectContext.logger.debug(`Processing file %s`, filePath);

  const namespaceDecl = sf.getFirstDescendant(isNamespaceDeclaration);
  if (!namespaceDecl) {
    projectContext.logger.trace("Couldn't find a namespace");
    return;
  }

  if (sf.getExportSymbols().length == 1) {
    if (namespaceDecl.getSymbolOrThrow().getDeclarations().length > 1) {
      projectContext.logger.debug(
        "Can't do ultra simple replacement, falling back to complicated for " +
          namespaceDecl.getName()
      );
    } else {
      replaceImportsAndExports(namespaceDecl, replacements, projectContext);
      unwrapNamespaceInFile(namespaceDecl, replacements);
      return;
    }
  }

  const context = projectContext.createNamespaceContext(namespaceDecl);

  const namespaceName = namespaceDecl.getName();
  context.logger.trace(`calculateNamespaceRemovals(): Found namespace %s`, namespaceName);

  const syntaxList = namespaceDecl.getChildSyntaxListOrThrow();
  const symbolsInRootScope = new Set(sf.getLocals().map((a) => a.getName()));

  for (const q of syntaxList.getChildren()) {
    if (Node.isVariableStatement(q)) {
      for (const varDecl of q.getDeclarations()) {
        if (symbolsInRootScope.has(varDecl.getName())) {
          // unwrap is going to make this really hard to deal with cause we
          // have figure out which was the old and which is the new so we
          // just bail on this file
          projectContext.logger.warn(
            { filename: varDecl.getSourceFile().getFilePath() },
            "Aborting fixing '%s' as it will be too hard to unwrap",
            varDecl.getName()
          );
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
    } else if (
      Node.isFunctionDeclaration(q) ||
      Node.isClassDeclaration(q) ||
      Node.isEnumDeclaration(q)
    ) {
      // Can't have unnamed functions in namespace unless its invoked,
      // but that would be an expression statement so we are okay
      const name = q.getName();
      Assert.ok(name != null, "name was expected");
      context.concreteRenames.add(name);
      // No special treatment. Don't trigger the logger error.
      // different style if statement to avoid making q `never` in the fallthrough
    } else if (Node.isModuleDeclaration(q)) {
      const name = q.getName();
      Assert.ok(name != null, "name was expected");
      context.concreteRenames.add(name);
    } else {
      context.logger.error("Unknown kind %s", q.getKindName());
    }
  }

  context.logger.trace(
    "calculateNamespaceRemovals(): Type rename: %s",
    Array.from(context.typeRenames).join(", ")
  );
  context.logger.trace(
    "calculateNamespaceRemovals(): Concrete rename: %s",
    Array.from(context.concreteRenames).join(", ")
  );

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

  // Almost done
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

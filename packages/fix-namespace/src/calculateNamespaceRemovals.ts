import * as Assert from "assert";
import type { ModuleDeclaration } from "ts-morph";
import { Node, type SourceFile, SyntaxKind } from "ts-morph";
import { isSafeToRenameAllAcrossReferences } from "./isSafeToRenameAllAcrossReferences.js";
import { renameAllReferences } from "./renameAllReferences.js";
import { isNamespaceDeclaration, type NamespaceLikeVariableDeclaration } from "@eartool/utils";
import * as path from "node:path";
import {
  replaceAllNamesInScope,
  type ProjectContext,
  type Replacements,
} from "@eartool/replacements";
import { renameExports } from "./renameExports.js";
import { replaceImportsAndExports } from "./replaceImportsAndExports.js";
import {
  renameVariablesInBody,
  replaceSelfReferentialUsage,
  unwrapInFile,
} from "./calculateNamespaceLikeRemovals.js";

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
      projectContext.logger.info(
        "Wanted to remove namespace %s but it has multiple declarations",
        namespaceDecl.getName()
      );
    } else {
      replaceImportsAndExports(namespaceDecl, replacements);
      unwrapInFile(namespaceDecl, replacements);
      return;
    }
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
    } else if (Node.isFunctionDeclaration(q) || Node.isClassDeclaration(q)) {
      // Can't have unnamed functions in namespace unless its invoked,
      // but that would be an expression statement so we are okay
      const name = q.getName();
      Assert.ok(name != null, "name was expected");
      context.concreteRenames.add(name);
    } else if (Node.isEnumDeclaration(q)) {
      throw new Error("Not implemented"); // FIXME
    } else {
      context.logger.error("Unknown kind %s", q.getKindName());
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

// function unwrapInFile(
//   varDecl: ModuleDeclaration | NamespaceLikeVariableDeclaration,
//   replacements: Replacements
//   /* intentionally blank*/
// ) {
//   const logger = replacements.logger.child({ primaryNode: varDecl });

//   const sf = varDecl.getSourceFile();
//   // const syntaxList = varDecl.getChildSyntaxList()!;
//   const syntaxList = Node.isModuleDeclaration(varDecl)
//     ? varDecl.getChildSyntaxList()!
//     : varDecl.getInitializer().getExpression().getChildSyntaxList()!;

//   const exportedNames = new Set(
//     syntaxList
//       .getChildren()
//       .flatMap((a) => (Node.isVariableStatement(a) ? a.getDeclarations() : a))
//       .filter(Node.hasName)
//       .map((a) => a.getName())
//   );

//   logger.trace("Exported names: %s", [...exportedNames].join(", "));

//   const startNode = Node.isModuleDeclaration(varDecl)
//     ? varDecl
//     : varDecl.getFirstAncestorByKindOrThrow(SyntaxKind.VariableStatement);

//   // Drop `export const Name = {`
//   // Drop `export namespace Foo {`
//   replacements.remove(sf, startNode.getStart(), syntaxList.getFullStart());

//   // drop `} as const;`
//   // drop `};`
//   const closeBrace = syntaxList.getNextSiblingIfKindOrThrow(SyntaxKind.CloseBraceToken);
//   replacements.remove(sf, closeBrace.getStart(), varDecl.getEnd());

//   const kids = Node.isModuleDeclaration(varDecl)
//     ? varDecl.getChildSyntaxListOrThrow().getChildren()
//     : varDecl.getInitializer().getExpression().getProperties();
//   for (const propOrMethod of kids) {
//     if (Node.isMethodDeclaration(propOrMethod)) {
//       replacements.insertBefore(propOrMethod, "export function ");
//       renameVariablesInBody(exportedNames, replacements, propOrMethod);
//     } else if (Node.isPropertyAssignment(propOrMethod)) {
//       replacements.addReplacement(
//         sf,
//         propOrMethod.getStart(),
//         propOrMethod.getFirstChildByKindOrThrow(SyntaxKind.ColonToken).getEnd(),
//         `export const ${(propOrMethod as any).getName()} = `
//       );
//     } else if (Node.isFunctionDeclaration(propOrMethod)) {
//       renameVariablesInBody(exportedNames, replacements, propOrMethod);
//     } else if (Node.isVariableStatement(propOrMethod)) {
//       // do nothing!
//     } else {
//       replacements.logger.error("Unexpected kind %s", propOrMethod.getKindName());
//     }
//     replacements.removeNextSiblingIfComma(propOrMethod);
//   }

//   // Its possible there was self referential code, so we need to handle that case
//   replaceSelfReferentialUsage(varDecl, replacements);

//   // And of course we can import things that now collide
//   replaceAllNamesInScope(replacements, varDecl.getSourceFile(), exportedNames);
// }

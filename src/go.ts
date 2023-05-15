import {
  Project,
  SourceFile,
  SyntaxKind,
} from "ts-morph";
import * as path from "node:path";
import { Node } from "ts-morph";
import { isSafeToRenameAcrossReferences } from "./isSafeToRenameAcrossReferences.js";
import { renameSymbolsInOriginalFile } from "./renameSymbolsInOriginalFile.js";
import { renameReferencesInOtherFiles } from "./renameReferencesInOtherFiles.js";
import { isNamespaceDeclaration } from "./utils/isNamespaceDeclaration.js";

/*
    Goal: lets get const / function / class / statement out of namespaces

    Lazy Approach:
    * 1 namespace per file per run
    * Extract to `niceName(namespaceName, namedEntity)`
    * Find all references to old `namedEntity` in package and replace with new name?
    * Add import to new name
    * Org imports
    * If something exports `namespaceName` then it needs to also export `newName`
    * Delete namespace if empty

*/

function processPackage(packagePath: string) {
  const project = new Project({
    tsConfigFilePath: path.join(packagePath, "tsconfig.json"),
  });

  for (const sf of project.getSourceFiles()) {
    //
  }
}

export async function processProject(project: Project) {
  for (const sf of project.getSourceFiles()) {
    processFile(sf);
  }

  for (const sf of project.getSourceFiles()) {
    sf.organizeImports();
  }
  await project.save();
}

export function processFile(sf: SourceFile) {
  const namespaceDecl = sf.getFirstDescendant(isNamespaceDeclaration);
  if (!namespaceDecl) return;

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
    const name = Node.isNameable(q) && q.getName();
    // console.log("-");
    // console.log(name);

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
    } else if (Node.isFunctionDeclaration(q) || Node.isClassDeclaration(q)) {
      // Can't have unnamed functions in namespace unless its invoked,
      // but that would be an expression statement so we are okay
      toRename.add(q.getNameOrThrow()); 
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
  renameReferencesInOtherFiles(toRename, namespaceDecl);

  // Actually break up the namespace
  namespaceDecl.unwrap();

  // Finally rename locally
  renameSymbolsInOriginalFile(toRename, sf, namespaceName);

  // console.log(sf.getFullText());
}



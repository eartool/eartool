import {
  Project,
  SourceFile,
  SyntaxKind,
  ModuleDeclaration,
  VariableStatementStructure,
  ts,
} from "ts-morph";
import * as path from "node:path";
import { Node } from "ts-morph";
import { VariableDeclaration } from "ts-morph";
import { VariableStatement } from "ts-morph";
import { format } from "prettier";

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
processTest();

function processPackage(packagePath: string) {
  const project = new Project({
    tsConfigFilePath: path.join(packagePath, "tsconfig.json"),
  });

  for (const sf of project.getSourceFiles()) {
    //
  }
}

function formatTestTypescript(src: string) {
  return format(src, { parser: "typescript", tabWidth: 2, useTabs: false });
}

const testInput = new Map([
  [
    "foo.ts",
    formatTestTypescript(`
    const foo = 5;
    
    export namespace Wat {
        export const aasdf = 3;
        export const second = 5;
    
        export function f() {
            return 5;
        }
        
        export class C {}
        
        export interface I {}
        
        export enum E{}
    }
    `),
  ],
]);
const expectedTestOutput = new Map([
  [
    "foo.ts",
    formatTestTypescript(`
    const foo = 5;

    const aasdfOfWat = 3;
    const secondOfWat = 5;
    
    export namespace Wat {
        export function f() {
            return 5;
        }
        
        export class C {}
        
        export interface I {}
        
        export enum E{}
    }
    `),
  ],
]);

function processTest() {
  const project = new Project();
  for (const [name, contents] of testInput) {
    project.createSourceFile(name, contents);
  }

  for (const sf of project.getSourceFiles()) {
    processFile(sf);
  }
}

function processFile(sf: SourceFile) {
  const variablesToMove: [VariableStatementStructure, number][] = [];
  const namespaceToDelete: number[] = [];

  let offset = 0;
  for (const decl of sf.getDescendantsOfKind(SyntaxKind.ModuleDeclaration)) {
    if (decl.isExported()) {
      console.log(
        decl.getName(),
        decl.hasNamespaceKeyword(),
        decl.getDeclarationKind()
      );

      const syntaxList = decl
        .getLastChildByKindOrThrow(SyntaxKind.ModuleBlock)
        .getLastChildByKindOrThrow(SyntaxKind.SyntaxList);

      for (const q of syntaxList.getChildren()) {
        console.log(q.getKindName());

        if (Node.isVariableStatement(q)) {
          newFunction(q, decl);
        } else if (Node.isFunctionDeclaration(q)) {
        } else if (Node.isClassDeclaration(q)) {
        } else if (Node.isInterfaceDeclaration(q)) {
        } else if (Node.isEnumDeclaration(q)) {
        } else {
          console.log(`Unknown kind: ${q.getKindName()}`);
        }
      }
      decl.remove();

      for (const [varStructure, idx] of variablesToMove) {
        const n = sf.insertVariableStatement(idx, varStructure);
      }
    }
    console.log(sf.getFullText());
  }

  function newFunction(q: VariableStatement, decl: ModuleDeclaration) {
    const newStructure = q.getStructure();
    for (const d of newStructure.declarations) {
      d.name = `${d.name}Of${decl.getName()}`;
    }
    variablesToMove.push([newStructure, decl.getChildIndex() + offset++]);
  }
}

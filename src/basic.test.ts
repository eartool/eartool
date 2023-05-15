import { describe, expect, it } from "@jest/globals";
import { format } from "prettier";
import { Project } from "ts-morph";
import { processFile, processProject } from "./go.js";

function formatTestTypescript(src: string) {
  return format(src, { parser: "typescript", tabWidth: 2, useTabs: false });
}

const cases = [
  {
    name: "simple",
    inputs: new Map([
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
    ]),
    outputs: new Map([
      [
        "foo.ts",
        formatTestTypescript(`
        const foo = 5;
    
        export const aasdfOfWat = 3;
        export const secondOfWat = 5;
        
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
    ]),
  },
];

describe("basic", () => {
  it.each(cases)("$name", async ({ inputs, outputs }) => {
    const project = new Project({ useInMemoryFileSystem: true });
    for (const [name, contents] of inputs) {
      project.createSourceFile(name, contents);
    }

    await processProject(project);

    const fs = project.getFileSystem();

    for (const [name, expectedContents] of outputs) {
        const writtenContents = fs.readFileSync(name);
        expect(writtenContents).toBe(expectedContents);
    }
    
  });
});

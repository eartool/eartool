import { describe, expect, it } from "@jest/globals";
import { format } from "prettier";
import { Project } from "ts-morph";
import { processFile, processProject } from "./go.js";

function formatTestTypescript(src: string) {
  return format(src, { parser: "typescript", tabWidth: 2, useTabs: false });
}

const cases = [
  {
    name: "dont explode if error",
    // We cant break foo out in this case cause im too lazy to implement this another way.
    inputs: new Map([
      [
        "foo.ts",
        `
            const foo = 5;
            
            export namespace Wat {
                export const foo = 6;
            }
            `,
      ],
    ]),
    outputs: new Map([
      [
        "foo.ts",
        `
            const foo = 5;
            
            export namespace Wat {
                export const foo = 6;
            }
            `,
      ],
    ]),
  },
  {
    name: "simple",
    inputs: new Map([
      [
        "foo.ts",
        `
        const foo = 5;
        
        export namespace Wat {
            export const aasdf = 3;
            export const second = 5;

            export const thirdSpaced = 56;

            // Foo
            export const fourthWithComment = 555;
        }
        `,
      ],
    ]),
    outputs: new Map([
      [
        "foo.ts",
        `
        const foo = 5;
    
        export const aasdfOfWat = 3;
        export const secondOfWat = 5;

        export const thirdSpacedOfWat = 56;

        // Foo
        export const fourthWithCommentOfWat = 555;
        `,
      ],
    ]),
  },
  {
    name: "rename in other file",
    inputs: new Map([
      [
        "wat.ts",
        `
        
        export namespace Wat {
            export const key = 3;
        }
        `,
      ],
      [
        "refWat.ts",
        `import {Wat} from "./wat";
        console.log(Wat.key);
        `,
      ],
    ]),
    outputs: new Map([
      [
        "wat.ts",
        `
        export const keyOfWat = 3;
        `,
      ],
      [
        "refWat.ts",
        `import {keyOfWat} from "./wat";
        
        console.log(keyOfWat);
        `,
      ],
    ]),
  },
];

describe("basic", () => {
  it.each(cases)("$name", async ({ inputs, outputs }) => {
    const project = new Project({
      useInMemoryFileSystem: true,
      skipAddingFilesFromTsConfig: true,
    });
    for (const [name, contents] of inputs) {
      project.createSourceFile(name, contents);
    }

    await processProject(project);

    const fs = project.getFileSystem();

    for (const [name, expectedContents] of outputs) {
      // TODO: Can we get this thing to just prettier
      const writtenContents = formatTestTypescript(fs.readFileSync(name));
      expect(writtenContents).toBe(formatTestTypescript(expectedContents));
    }
  });
});

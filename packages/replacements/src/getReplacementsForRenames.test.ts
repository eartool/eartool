import { describe, expect, it } from "@jest/globals";
import { Project } from "ts-morph";
import { getReplacementsForRenames } from "./getReplacementsForRenames.js";
import type { Replacement } from "./Replacement.js";
import { createConsoleLogger } from "@eartool/utils";

describe(getReplacementsForRenames, () => {
  it("records renames from root", async () => {
    const indexFileParts = [
      `import {`,
      `Foo`,
      `} from "lib";\n`,
      `export type Asdf =`,
      `Foo.Props`,
      `;`,
    ];
    const indexFileContents = indexFileParts.join("");

    const project = createProjectForTest({
      "index.ts": indexFileContents,
    });

    const r = getReplacementsForRenames(
      project,
      new Map([["lib", [{ from: ["Foo", "Props"], to: ["FooProps"] }]]]),
      createConsoleLogger("error")
    );

    expect(r).toEqual([
      createReplacement("/index.ts", indexFileParts, 1, 1, "FooProps,"),
      createReplacement("/index.ts", indexFileParts, 4, 5, "FooProps"),
    ]);
  });

  it("handles star imprts", async () => {
    const indexFileParts = [
      `import * as Bar from "lib";\n`,
      `export type Asdf =`,
      `Bar.Foo.Props`,
      `;`,
    ];
    const indexFileContents = indexFileParts.join("");

    const project = createProjectForTest({
      "index.ts": indexFileContents,
    });

    const r = getReplacementsForRenames(
      project,
      new Map([["lib", [{ from: ["Foo", "Props"], to: ["FooProps"] }]]]),
      createConsoleLogger("error")
    );

    expect(r).toEqual([createReplacement("/index.ts", indexFileParts, 2, 3, "Bar.FooProps")]);
  });

  it("handles star imprts property access", async () => {
    const indexFileParts = [
      `import * as Bar from "lib";\n`,
      `export const Asdf =`,
      `Bar.Foo.Props`,
      `;`,
    ];
    const indexFileContents = indexFileParts.join("");

    const project = createProjectForTest({
      "index.ts": indexFileContents,
    });

    const r = getReplacementsForRenames(
      project,
      new Map([["lib", [{ from: ["Foo", "Props"], to: ["FooProps"] }]]]),
      createConsoleLogger("error")
    );

    expect(r).toEqual([createReplacement("/index.ts", indexFileParts, 2, 3, "Bar.FooProps")]);
  });

  it("does property access", async () => {
    const indexFileParts = [
      `import {`,
      `Foo`,
      `} from "lib";\n`,
      `export const Asdf =`,
      `Foo.Props`,
      `;`,
    ];
    const indexFileContents = indexFileParts.join("");

    const project = createProjectForTest({
      "index.ts": indexFileContents,
    });

    const r = getReplacementsForRenames(
      project,
      new Map([["lib", [{ from: ["Foo", "Props"], to: ["FooProps"] }]]]),
      createConsoleLogger("error")
    );

    expect(r).toEqual([
      createReplacement("/index.ts", indexFileParts, 1, 1, "FooProps,"),
      createReplacement("/index.ts", indexFileParts, 4, 5, "FooProps"),
    ]);
  });

  it("Can do really complicated renames", async () => {
    const indexFileParts = [
      `import {`,
      `Foo`,
      `} from "lib";\n`,
      `export type Asdf =`,
      `Foo.Props`,
      `;`,
    ];
    const indexFileContents = indexFileParts.join("");

    const project = createProjectForTest({
      "index.ts": indexFileContents,
    });

    const r = getReplacementsForRenames(
      project,
      new Map([["lib", [{ from: ["Foo", "Props"], to: ["Baz", "Other"] }]]]),
      createConsoleLogger("error")
    );

    expect(r).toEqual([
      createReplacement("/index.ts", indexFileParts, 1, 1, "Baz,"),
      createReplacement("/index.ts", indexFileParts, 4, 5, "Baz.Other"),
    ]);
  });

  it("records renames from root with multiple refs", async () => {
    const indexFileParts = [
      `import {`,
      `Foo`,
      `} from "lib";\n`,
      `export type Asdf =`,
      `Foo.Props`,
      `;\n`,
      `export type Bleh =`,
      `Foo.Props`,
      `;`,
    ];
    const indexFileContents = indexFileParts.join("");

    const project = createProjectForTest({
      "index.ts": indexFileContents,
    });

    const r = getReplacementsForRenames(
      project,
      new Map([["lib", [{ from: ["Foo", "Props"], to: ["FooProps"] }]]]),
      createConsoleLogger("error")
    );

    expect(r).toEqual([
      createReplacement("/index.ts", indexFileParts, 1, 1, "FooProps,"),
      createReplacement("/index.ts", indexFileParts, 4, 5, "FooProps"),
      createReplacement("/index.ts", indexFileParts, 7, 8, "FooProps"),
    ]);
  });

  it("records renames from root with multiple refs that are complex", async () => {
    const indexFileParts = [
      `import {`,
      `Foo`,
      `} from "lib";\n`,
      `export type Asdf =`,
      `Foo.Props`,
      `;\n`,
      `export type Bleh =`,
      `Foo.Props`,
      `;`,
    ];
    const indexFileContents = indexFileParts.join("");

    const project = createProjectForTest({
      "index.ts": indexFileContents,
    });

    const r = getReplacementsForRenames(
      project,
      new Map([["lib", [{ from: ["Foo", "Props"], to: ["Merp", "Other"] }]]]),
      createConsoleLogger("error")
    );

    expect(r).toEqual([
      createReplacement("/index.ts", indexFileParts, 1, 1, "Merp,"),
      createReplacement("/index.ts", indexFileParts, 4, 5, "Merp.Other"),
      createReplacement("/index.ts", indexFileParts, 7, 8, "Merp.Other"),
    ]);
  });

  it("records renames from root with multiple replacements", async () => {
    const indexFileParts = [
      `import {`,
      `Foo`,
      `} from "lib";\n`,
      `export type Asdf =`,
      `Foo.Props`,
      `;\n`,
      `export type Bleh =`,
      `Foo.State`,
      `;`,
    ];
    const indexFileContents = indexFileParts.join("");

    const project = createProjectForTest({
      "index.ts": indexFileContents,
    });

    const r = getReplacementsForRenames(
      project,
      new Map([
        [
          "lib",
          [
            { from: ["Foo", "Props"], to: ["FooProps"] },
            { from: ["Foo", "State"], to: ["FooState"] },
          ],
        ],
      ]),
      createConsoleLogger("error")
    );

    expect(r).toEqual([
      createReplacement("/index.ts", indexFileParts, 1, 1, "FooProps,"),
      createReplacement("/index.ts", indexFileParts, 4, 5, "FooProps"),
      createReplacement("/index.ts", indexFileParts, 1, 1, "FooState,"),
      createReplacement("/index.ts", indexFileParts, 7, 8, "FooState"),
    ]);
  });

  it("records renames from root with multiple replacements that are complex", async () => {
    const indexFileParts = [
      `import {`,
      `Foo`,
      `} from "lib";\n`,
      `export type Asdf =`,
      `Foo.Props`,
      `;\n`,
      `export type Bleh =`,
      `Foo.State`,
      `;`,
    ];
    const indexFileContents = indexFileParts.join("");

    const project = createProjectForTest({
      "index.ts": indexFileContents,
    });

    const r = getReplacementsForRenames(
      project,
      new Map([
        [
          "lib",
          [
            { from: ["Foo", "Props"], to: ["Baz", "Other"] },
            { from: ["Foo", "State"], to: ["Bar", "Moo"] },
          ],
        ],
      ]),
      createConsoleLogger("error")
    );

    expect(r).toEqual([
      createReplacement("/index.ts", indexFileParts, 1, 1, "Baz,"),
      createReplacement("/index.ts", indexFileParts, 4, 5, "Baz.Other"),
      createReplacement("/index.ts", indexFileParts, 1, 1, "Bar,"),
      createReplacement("/index.ts", indexFileParts, 7, 8, "Bar.Moo"),
    ]);
  });

  it("records renames with multiple files", async () => {
    // If references can be resolved across files, they will be, creating issues.
    // this test will make sure that the references do resolve and therefore
    // are handled properly
    const indexFileParts = [
      `import {`,
      `Foo`,
      `} from "./lib";\n`,
      `export const Asdf =`,
      `Foo.Props`,
      `;\n`,
      `export const Bleh =`,
      `Foo.State`,
      `;`,
    ];

    const fooFileParts = [
      `import {`,
      `Foo`,
      `} from "./lib";\n`,
      `export const Asdf =`,
      `Foo.Props`,
      `;\n`,
      `export const Bleh =`,
      `Foo.State`,
      `;`,
    ];

    const libFooParts = `
    export const Foo = {
      State: 5,
      Props: 6
    };`;

    const project = createProjectForTest({
      "index.ts": indexFileParts.join(""),
      "foo.ts": fooFileParts.join(""),
      "lib.ts": libFooParts,
    });

    const r = getReplacementsForRenames(
      project,
      new Map([
        [
          "./lib",
          [
            { from: ["Foo", "Props"], to: ["FooProps"] },
            { from: ["Foo", "State"], to: ["FooState"] },
          ],
        ],
        [
          "bar",
          [
            { from: ["Foo", "Props"], to: ["FooProps"] },
            { from: ["Foo", "State"], to: ["FooState"] },
          ],
        ],
      ]),
      createConsoleLogger("error")
    );

    expect(r).toEqual([
      createReplacement("/foo.ts", indexFileParts, 1, 1, "FooProps,"),
      createReplacement("/foo.ts", indexFileParts, 4, 5, "FooProps"),
      createReplacement("/foo.ts", indexFileParts, 1, 1, "FooState,"),
      createReplacement("/foo.ts", indexFileParts, 7, 8, "FooState"),
      createReplacement("/index.ts", fooFileParts, 1, 1, "FooProps,"),
      createReplacement("/index.ts", fooFileParts, 4, 5, "FooProps"),
      createReplacement("/index.ts", fooFileParts, 1, 1, "FooState,"),
      createReplacement("/index.ts", fooFileParts, 7, 8, "FooState"),
    ]);
  });
});

function createReplacement(
  filePath: string,
  fileParts: string[],
  startIndex: number,
  endIndex: number,
  newValue: string
): Replacement {
  const start = fileParts.slice(0, startIndex).join("").length;
  const end = fileParts.slice(0, endIndex).join("").length;
  return {
    start,
    end,
    filePath,
    newValue,
  };
}

function createProjectForTest(inputs: Record<string, string>) {
  const project = new Project({
    useInMemoryFileSystem: true,
    skipAddingFilesFromTsConfig: true,
  });
  for (const [name, contents] of Object.entries(inputs)) {
    project.createSourceFile(name, contents);
  }
  project.saveSync();
  return project;
}
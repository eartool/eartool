import { describe, it, expect } from "@jest/globals";
import { TestBuilder } from "./TestBuilder.js";
import { addSingleFileReplacementsForRenames } from "./addSingleFileReplacementsForRenames.js";
import { createTestLogger } from "@eartool/test-utils";

describe(addSingleFileReplacementsForRenames, () => {
  it("renames a rexport ", () => {
    const { output } = new TestBuilder()
      .addFile(
        "/index.ts",
        `
          export {bar} from "./bar";
      `
      )
      .performWork(({ replacements, files }) => {
        addSingleFileReplacementsForRenames(
          files.get("/index.ts")!,
          new Map([["./bar", [{ from: ["bar"], to: ["bar"], toFileOrModule: "baz" }]]]),
          replacements,
          createTestLogger(),
          false
        );
      })
      .build();

    expect(output).toMatchInlineSnapshot(`
      "
      //
      // </index.ts>
      //

      export { bar } from "baz";
      export {} from "./bar";


      //
      // <//index.ts>
      //

      "
    `);
    //
  });

  it("renames a reexport keeping the old! ", () => {
    const { output } = new TestBuilder()
      .addFile(
        "/index.ts",
        `
          export {bar, foo} from "./bar";
      `
      )
      .performWork(({ replacements, files }) => {
        addSingleFileReplacementsForRenames(
          files.get("/index.ts")!,
          new Map([["./bar", [{ from: ["bar"], to: ["bar"], toFileOrModule: "baz" }]]]),
          replacements,
          createTestLogger(),
          false
        );
      })
      .build();

    expect(output).toMatchInlineSnapshot(`
      "
      //
      // </index.ts>
      //

      export { bar } from "baz";
      export { foo } from "./bar";


      //
      // <//index.ts>
      //

      "
    `);
    //
  });

  it("properly handles full file paths", () => {
    const { output } = new TestBuilder()
      .addFile(
        "/index.ts",
        `
          export {bar} from "./bar";
      `
      )
      .addFile(
        "/nested/foo.ts",
        `import {bar} from "../bar"; export const nestedFoo: string = doStuff(bar); `
      )
      .performWork(({ replacements, files }) => {
        addSingleFileReplacementsForRenames(
          files.get("/nested/foo.ts")!,
          new Map([["/bar.ts", [{ from: ["bar"], to: ["bar"], toFileOrModule: "baz" }]]]),
          replacements,
          createTestLogger(),
          false
        );
        addSingleFileReplacementsForRenames(
          files.get("/index.ts")!,
          new Map([["/bar.ts", [{ from: ["bar"], to: ["bar"], toFileOrModule: "baz" }]]]),
          replacements,
          createTestLogger(),
          false
        );
      })
      .build();

    expect(output).toMatchInlineSnapshot(`
      "
      //
      // </nested/foo.ts>
      //

      import { bar } from "baz";
      import {} from "../bar";
      export const nestedFoo: string = doStuff(bar);


      //
      // <//nested/foo.ts>
      //




      //
      // </index.ts>
      //

      export { bar } from "baz";
      export {} from "./bar";


      //
      // <//index.ts>
      //

      "
    `);
    //
  });
});

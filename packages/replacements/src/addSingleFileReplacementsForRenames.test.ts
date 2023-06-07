import { describe, it, expect } from "@jest/globals";
import { TestBuilder } from "./TestBuilder.js";
import { addSingleFileReplacementsForRenames } from "./addSingleFileReplacementsForRenames.js";

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
          replacements
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
          replacements
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
});

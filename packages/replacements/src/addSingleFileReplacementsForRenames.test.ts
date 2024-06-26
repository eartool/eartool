import { describe, expect, it } from "vitest";
import { addSingleFileReplacementsForRenames } from "./addSingleFileReplacementsForRenames.js";
import { TestBuilder } from "./TestBuilder.js";

describe(addSingleFileReplacementsForRenames, () => {
  it("renames a rexport ", async () => {
    const { output } = await new TestBuilder()
      .addFile(
        "/index.ts",
        `
          export {bar} from "./bar";
      `,
      )
      .performWork(({ replacements, files, ctx }) => {
        addSingleFileReplacementsForRenames(
          ctx,
          files.get("/index.ts")!,
          new Map([["./bar", [{ from: ["bar"], to: ["bar"], toFileOrModule: "baz" }]]]),
          replacements,
          false,
        );
      })
      .build();

    expect(output).toMatchInlineSnapshot(`
      "
      //
      // </index.ts>
      //

      export { bar } from "baz";


      //
      // <//index.ts>
      //

      "
    `);
    //
  });

  it("renames an import with named only", async () => {
    const { output } = await new TestBuilder()
      .addFile(
        "/index.ts",
        `
          import {bar, bleh} from "bar";
          doThing(bar);
          doThing(bleh);
      `,
      )
      .performWork(({ replacements, files, ctx }) => {
        addSingleFileReplacementsForRenames(
          ctx,
          files.get("/index.ts")!,
          new Map([
            [
              "bar",
              [
                { from: ["bar"], toFileOrModule: "baz" },
                { from: ["bleh"], toFileOrModule: "baz" },
              ],
            ],
          ]),
          replacements,
          false,
        );
      })
      .build();

    expect(output).toMatchInlineSnapshot(`
      "
      //
      // </index.ts>
      //

      import { bar, bleh } from "baz";
      doThing(bar);
      doThing(bleh);


      //
      // <//index.ts>
      //

      "
    `);
    //
  });

  it("renames an import with default and named", async () => {
    const { output } = await new TestBuilder()
      .addFile(
        "/index.ts",
        `
          import defImp, {bar, bleh} from "bar";
          doThing(bar);
          doThing(bleh);
          doThing(defImp);
      `,
      )
      .performWork(({ replacements, files, ctx }) => {
        addSingleFileReplacementsForRenames(
          ctx,
          files.get("/index.ts")!,
          new Map([
            [
              "bar",
              [
                { from: ["bar"], toFileOrModule: "baz" },
                { from: ["bleh"], toFileOrModule: "baz" },
              ],
            ],
          ]),
          replacements,
          false,
        );
      })
      .build();

    expect(output).toMatchInlineSnapshot(`
      "
      //
      // </index.ts>
      //

      import defImp from "bar";
      import { bar } from "baz";
      import { bleh } from "baz";
      doThing(bar);
      doThing(bleh);
      doThing(defImp);


      //
      // <//index.ts>
      //

      "
    `);
    //
  });

  it("renames an namespace ", async () => {
    const { output } = await new TestBuilder()
      .addFile(
        "/index.ts",
        `
          import * as bar from "bar";
          doThing(bar.Baz);
      `,
      )
      .performWork(({ replacements, files, ctx }) => {
        addSingleFileReplacementsForRenames(
          ctx,
          files.get("/index.ts")!,
          new Map([["bar", [{ from: ["Baz"], toFileOrModule: "baz" }]]]),
          replacements,
          false,
        );
      })
      .build();

    expect(output).toMatchInlineSnapshot(`
      "
      //
      // </index.ts>
      //

      import * as bar from "baz";
      doThing(bar.Baz);


      //
      // <//index.ts>
      //

      "
    `);
    //
  });

  it("renames a reexport keeping the old! ", async () => {
    const { output } = await new TestBuilder()
      .addFile(
        "/index.ts",
        `
          export {bar, foo} from "./bar";
      `,
      )
      .performWork(({ replacements, files, ctx }) => {
        addSingleFileReplacementsForRenames(
          ctx,
          files.get("/index.ts")!,
          new Map([["./bar", [{ from: ["bar"], to: ["bar"], toFileOrModule: "baz" }]]]),
          replacements,
          false,
        );
      })
      .build();

    expect(output).toMatchInlineSnapshot(`
      "
      //
      // </index.ts>
      //

      export { foo } from "./bar";
      export { bar } from "baz";


      //
      // <//index.ts>
      //

      "
    `);
    //
  });

  it("deeploy handles the renames", async () => {
    const { output } = await new TestBuilder()
      .addFile(
        "/index.ts",
        `
          export const bar =5;
      `,
      )
      .addFile(
        "/nested/foo.ts",
        `
          import {bar} from "barModule"; 
          export function* insideGenerator() {
            yield bar();
          }
          `,
      )
      .performWork(({ replacements, files, ctx }) => {
        addSingleFileReplacementsForRenames(
          ctx,
          files.get("/nested/foo.ts")!,
          new Map([
            ["barModule", [{ from: ["bar"], to: ["otherImport"], toFileOrModule: "otherModule" }]],
          ]),
          replacements,
          false,
        );
      })
      .build();

    expect(output).toMatchInlineSnapshot(`
      "
      //
      // </nested/foo.ts>
      //

      import { otherImport } from "otherModule";
      export function* insideGenerator() {
        yield otherImport();
      }


      //
      // <//nested/foo.ts>
      //

      "
    `);
  });

  it("properly handles full file paths", async () => {
    const { output } = await new TestBuilder()
      .addFile(
        "/index.ts",
        `
          export {bar} from "./bar";
      `,
      )
      .addFile(
        "/nested/foo.ts",
        `import {bar} from "../bar"; export const nestedFoo: string = doStuff(bar); `,
      )
      .performWork(({ replacements, files, ctx }) => {
        addSingleFileReplacementsForRenames(
          ctx,
          files.get("/nested/foo.ts")!,
          new Map([["/bar.ts", [{ from: ["bar"], to: ["bar"], toFileOrModule: "baz" }]]]),
          replacements,
          false,
        );
        addSingleFileReplacementsForRenames(
          ctx,
          files.get("/index.ts")!,
          new Map([["/bar.ts", [{ from: ["bar"], to: ["bar"], toFileOrModule: "baz" }]]]),
          replacements,
          false,
        );
      })
      .build();

    expect(output).toMatchInlineSnapshot(`
      "
      //
      // </nested/foo.ts>
      //

      import { bar } from "baz";
      export const nestedFoo: string = doStuff(bar);


      //
      // <//nested/foo.ts>
      //




      //
      // </index.ts>
      //

      export { bar } from "baz";


      //
      // <//index.ts>
      //

      "
    `);
    //
  });
});

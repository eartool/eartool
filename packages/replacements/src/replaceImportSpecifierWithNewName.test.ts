import { getImportSpecifierOrThrow } from "@eartool/utils";
import { describe, expect, it } from "vitest";
import { replaceImportSpecifierWithNewName } from "./replaceImportSpecifierWithNewName.js";
import { TestBuilder } from "./TestBuilder.js";

describe(replaceImportSpecifierWithNewName, () => {
  it("renames an import locally", async () => {
    const { output } = await new TestBuilder()
      .addFile("/foo.ts", `import { bar } from "./baz";`)
      .performWork(({ replacements, files }) => {
        const importSpecifier = getImportSpecifierOrThrow(files.get("/foo.ts")!, "./baz", "bar");
        replaceImportSpecifierWithNewName(replacements, importSpecifier, "foo");
      })
      .build();

    expect(output).toMatchInlineSnapshot(`
      "
      //
      // </foo.ts>
      //

      import { bar as foo } from "./baz";


      //
      // <//foo.ts>
      //

      "
    `);
    //
  });
});

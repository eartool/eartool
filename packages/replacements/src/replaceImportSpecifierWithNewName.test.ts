import { describe, it, expect } from "@jest/globals";
import { replaceImportSpecifierWithNewName } from "./replaceImportSpecifierWithNewName.js";
import { TestBuilder } from "./TestBuilder.js";
import { getImportSpecifierOrThrow } from "@eartool/utils";

describe(replaceImportSpecifierWithNewName, () => {
  it("renames an import locally", () => {
    const { output } = new TestBuilder()
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

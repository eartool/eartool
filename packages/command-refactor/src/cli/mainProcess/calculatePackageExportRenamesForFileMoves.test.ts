import { describe, it, expect } from "@jest/globals";
import { TestBuilder, type PackageExportRename } from "@eartool/replacements";
import { calculatePackageExportRenamesForFileMoves } from "./calculatePackageExportRenamesForFileMoves.js";

describe(calculatePackageExportRenamesForFileMoves, () => {
  it("asdf a named import module specifier ", () => {
    const { project } = new TestBuilder()
      .addFile(
        "/src/foo.ts",
        `
          export const foo = 5;
      `
      )
      .addFile(
        "/src/index.ts",
        `
        export {foo} from "./foo";
      `
      )
      .build();

    const renames = calculatePackageExportRenamesForFileMoves(
      project,
      new Set(["/src/foo.ts"]),
      "/",
      "baz"
    );

    const expected: PackageExportRename[] = [{ from: ["foo"], to: ["foo"], toFileOrModule: "baz" }];
    expect(renames).toEqual(expected);

    //
  });
});

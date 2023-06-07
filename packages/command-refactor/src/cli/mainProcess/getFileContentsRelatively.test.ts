import { describe, it, expect } from "@jest/globals";
import { TestBuilder } from "@eartool/replacements";
import { getFileContentsRelatively } from "./getFileContentsRelatively.js";

describe(getFileContentsRelatively, () => {
  it("asdf a named import module specifier ", () => {
    const { project } = new TestBuilder()
      .addFile("/packages/merp/src/foo.ts", `export const foo = 5;`)
      .build();

    const r = getFileContentsRelatively(
      project,
      "/packages/merp",
      new Set(["/packages/merp/src/foo.ts"])
    );

    expect(r).toEqual(new Map([["src/foo.ts", `export const foo = 5;`]]));

    //
  });
});

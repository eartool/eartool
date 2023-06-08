import { describe, it, expect } from "@jest/globals";
import { getFileContentsRelatively } from "./getFileContentsRelatively.js";
import { WorkspaceBuilder } from "./WorkspaceBuilder.js";

describe(getFileContentsRelatively, () => {
  it("asdf a named import module specifier ", () => {
    const { workspace, projectLoader } = new WorkspaceBuilder("/workspace")
      .createProject("foo", (p) => {
        p.addFile("/packages/merp/src/foo.ts", `export const foo = 5;`);
      })
      .build();

    const project = projectLoader(workspace.getPackageBy({ name: "foo" })!.packagePath)!;

    const r = getFileContentsRelatively(
      project,
      "/packages/merp",
      new Set(["/packages/merp/src/foo.ts"])
    );

    expect(r).toEqual(new Map([["src/foo.ts", `export const foo = 5;`]]));

    //
  });
});

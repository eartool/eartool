import { describe, it, expect } from "@jest/globals";
import { getFileContentsRelatively } from "./getFileContentsRelatively.js";
import { RefactorWorkspaceBuilder } from "../test-utils/RefactorWorkspaceBuilder.js";

describe(getFileContentsRelatively, () => {
  it("asdf a named import module specifier ", () => {
    const { workspace, projectLoader } = new RefactorWorkspaceBuilder("/workspace")
      .createProject("merp", (p) => {
        p.addFile("src/foo.ts", `export const foo = 5;`);
      })
      .build();

    const project = projectLoader(workspace.getPackageByNameOrThrow("merp").packagePath)!;

    const r = getFileContentsRelatively(
      project,
      "/workspace/merp",
      new Set(["/workspace/merp/src/foo.ts"])
    );

    expect(r).toEqual(new Map([["src/foo.ts", `export const foo = 5;`]]));

    //
  });
});

import { describe, it, expect } from "@jest/globals";
import { WorkspaceBuilder } from "../test-utils/WorkspaceBuilder.js";
import { getFileContentsRelatively } from "./getFileContentsRelatively.js";

describe(getFileContentsRelatively, () => {
  it("asdf a named import module specifier ", () => {
    const { workspace, projectLoader } = new WorkspaceBuilder("/workspace")
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

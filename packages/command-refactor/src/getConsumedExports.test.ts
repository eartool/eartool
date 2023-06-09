import { describe, it } from "@jest/globals";
import { expect } from "@jest/globals";
import { getConsumedExports, type Metadata } from "./getConsumedExports.js";
import { createProjectForTest } from "@eartool/test-utils";
import { WorkspaceBuilder } from "./WorkspaceBuilder.js";

describe(getConsumedExports, () => {
  it("idk", () => {
    const project = createProjectForTest({
      "index.ts": `
        export {foo} from "./foo";
      `,
      "foo.ts": `
        export const foo = 5;
      `,
      "importFrom.ts": `
        import {foo} from "./foo";
      `,
      "reexportAs.ts": `
        export {foo as baz} from "./foo";
      `,
      "reexportAsDefault.ts": `
        export {foo as default} from "./foo";
      `,
      "importFromIndirection.ts": `
        import fooByAnotherName from "./reexportAsDefault"
      `,
      "reassignThenExport.ts": `
        import {foo} from "./foo";

        export const baz = foo;
      `,
    });

    const result = getConsumedExports(project.getSourceFileOrThrow("foo.ts"));

    expect(result).toEqual(
      new Map(
        Object.entries<Metadata>({
          "/index.ts": {
            reexports: new Set(["foo"]),
            imports: new Set(),
            reexportsFrom: new Map(),
          },

          "/reexportAs.ts": {
            reexports: new Set(["foo"]),
            imports: new Set(),
            reexportsFrom: new Map(),
          },

          "/reexportAsDefault.ts": {
            reexports: new Set(["foo"]),
            imports: new Set(),
            reexportsFrom: new Map(),
          },

          "/importFrom.ts": {
            reexports: new Set(),
            imports: new Set(["foo"]),
            reexportsFrom: new Map(),
          },

          "/importFromIndirection.ts": {
            reexports: new Set(),
            imports: new Set(["foo"]),
            reexportsFrom: new Map(),
          },

          "/reassignThenExport.ts": {
            reexports: new Set(["foo"]),
            imports: new Set(["foo"]),
            reexportsFrom: new Map(),
          },
        })
      )
    );
    //
  });

  it("renames a named import module specifier ", () => {
    const { workspace, projectLoader } = new WorkspaceBuilder("/workspace")
      .createProject("foo", (p) => {
        p.addFile(
          "src/foo.ts",
          `
          export const foo = 5;
      `
        ).addFile(
          "src/index.ts",
          `
        export {foo} from "./foo";
      `
        );
      })
      .build();
    const project = projectLoader(workspace.getPackageByNameOrThrow("foo").packagePath)!;

    const q = getConsumedExports(project.getSourceFileOrThrow("/workspace/foo/src/index.ts"));

    expect(q).toEqual(
      new Map(
        Object.entries<Metadata>({
          "/workspace/foo/src/index.ts": {
            imports: new Set(),
            reexports: new Set(),
            reexportsFrom: new Map([["foo", "/workspace/foo/src/foo.ts"]]),
          },
        })
      )
    );

    //
  });
});
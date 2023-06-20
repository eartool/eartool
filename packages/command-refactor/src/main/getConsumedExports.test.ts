import { createProjectForTest } from "@eartool/test-utils";
import { describe, expect, it } from "@jest/globals";
import { getConsumedExports } from "./getConsumedExports.js";
import { RefactorWorkspaceBuilder } from "../test-utils/RefactorWorkspaceBuilder.js";

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

    expect(result).toMatchInlineSnapshot(`
      Map {
        "/reexportAs.ts" => {
          "imports": Set {},
          "reexports": Map {
            "foo" => "baz",
          },
          "reexportsFrom": Map {},
        },
        "/reexportAsDefault.ts" => {
          "imports": Set {},
          "reexports": Map {
            "foo" => "default",
          },
          "reexportsFrom": Map {},
        },
        "/index.ts" => {
          "imports": Set {},
          "reexports": Map {
            "foo" => "foo",
          },
          "reexportsFrom": Map {},
        },
        "/importFrom.ts" => {
          "imports": Set {
            "foo",
          },
          "reexports": Map {},
          "reexportsFrom": Map {},
        },
        "/importFromIndirection.ts" => {
          "imports": Set {
            "foo",
          },
          "reexports": Map {},
          "reexportsFrom": Map {},
        },
        "/reassignThenExport.ts" => {
          "imports": Set {
            "foo",
          },
          "reexports": Map {
            "foo" => "baz",
          },
          "reexportsFrom": Map {},
        },
      }
    `);
  });

  it("renames a named import module specifier ", () => {
    const { workspace, projectLoader } = new RefactorWorkspaceBuilder("/workspace")
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

    const result = getConsumedExports(project.getSourceFileOrThrow("/workspace/foo/src/index.ts"));

    expect(result).toMatchInlineSnapshot(`
      Map {
        "/workspace/foo/src/index.ts" => {
          "imports": Set {},
          "reexports": Map {},
          "reexportsFrom": Map {
            "foo" => "/workspace/foo/src/foo.ts",
          },
        },
      }
    `);
  });
});

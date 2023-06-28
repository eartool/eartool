import { createProjectForTest } from "@eartool/test-utils";
import { describe, expect, it } from "@jest/globals";
import { getConsumedExports } from "./getConsumedExports.js";
import { RefactorWorkspaceBuilder } from "../test-utils/RefactorWorkspaceBuilder.js";

describe(getConsumedExports, () => {
  describe("idk", () => {
    const project = createProjectForTest({
      "index.ts": `
      export {foo} from "./foo";
      export {Foo} from "./exportedType";
      export {Wtf} from "./exportedType";
    `,
      "foo.ts": `
      export const foo = 5;
    `,
      "exportedType.ts": `
      export type Foo = number;

      export interface Wtf {
        foo: Foo;
      }
    `,
      "importFrom.ts": `
      import {foo} from "./foo";
      import {Foo, Wtf} from "./exportedType";
    `,
      "importFromAsType.ts": `
      import type {foo} from "./foo";
      import type {Foo} from "./exportedType";
      import {type Wtf} from "./exportedType";
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

    it("foo.ts", () => {
      const result = getConsumedExports(project.getSourceFileOrThrow("foo.ts"));

      expect(result).toMatchInlineSnapshot(`
        Map {
          "/reexportAs.ts" => {
            "imports": Map {},
            "reexports": Map {
              "foo" => {
                "exportName": "baz",
                "isType": false,
              },
            },
            "reexportsFrom": Map {},
          },
          "/reexportAsDefault.ts" => {
            "imports": Map {},
            "reexports": Map {
              "foo" => {
                "exportName": "default",
                "isType": false,
              },
            },
            "reexportsFrom": Map {},
          },
          "/index.ts" => {
            "imports": Map {},
            "reexports": Map {
              "foo" => {
                "exportName": "foo",
                "isType": false,
              },
            },
            "reexportsFrom": Map {},
          },
          "/importFrom.ts" => {
            "imports": Map {
              "foo" => {
                "isType": false,
              },
            },
            "reexports": Map {},
            "reexportsFrom": Map {},
          },
          "/importFromAsType.ts" => {
            "imports": Map {
              "foo" => {
                "isType": true,
              },
            },
            "reexports": Map {},
            "reexportsFrom": Map {},
          },
          "/importFromIndirection.ts" => {
            "imports": Map {
              "foo" => {
                "isType": false,
              },
            },
            "reexports": Map {},
            "reexportsFrom": Map {},
          },
          "/reassignThenExport.ts" => {
            "imports": Map {
              "foo" => {
                "isType": false,
              },
            },
            "reexports": Map {
              "foo" => {
                "exportName": "baz",
                "isType": false,
              },
            },
            "reexportsFrom": Map {},
          },
        }
      `);
    });

    it("exportedType.ts", () => {
      const result = getConsumedExports(project.getSourceFileOrThrow("exportedType.ts"));

      expect(result).toMatchInlineSnapshot(`
        Map {
          "/exportedType.ts" => {
            "imports": Map {},
            "reexports": Map {},
            "reexportsFrom": Map {},
          },
          "/index.ts" => {
            "imports": Map {},
            "reexports": Map {
              "Foo" => {
                "exportName": "Foo",
                "isType": false,
              },
              "Wtf" => {
                "exportName": "Wtf",
                "isType": false,
              },
            },
            "reexportsFrom": Map {},
          },
          "/importFrom.ts" => {
            "imports": Map {
              "Foo" => {
                "isType": false,
              },
              "Wtf" => {
                "isType": false,
              },
            },
            "reexports": Map {},
            "reexportsFrom": Map {},
          },
          "/importFromAsType.ts" => {
            "imports": Map {
              "Foo" => {
                "isType": true,
              },
              "Wtf" => {
                "isType": true,
              },
            },
            "reexports": Map {},
            "reexportsFrom": Map {},
          },
        }
      `);
    });
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
          "imports": Map {},
          "reexports": Map {},
          "reexportsFrom": Map {
            "foo" => {
              "isType": false,
              "originFile": "/workspace/foo/src/foo.ts",
            },
          },
        },
      }
    `);
  });
});

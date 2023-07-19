import { createProjectForTest, createTestLogger } from "@eartool/test-utils";
import { describe, expect, it } from "@jest/globals";
import type { Metadata } from "@eartool/utils";
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
      export default 8;
    `,
      "exportedType.ts": `
      export type Foo = number;

      export interface Wtf {
        foo: Foo;
      }
    `,
      "importFrom.ts": `
      import {foo as foofoo} from "./foo";
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
      const result = getConsumedExports(
        {
          packageName: "foo",
          packagePath: "/",
          logger: createTestLogger(),
          project,
          packageJson: {},
        },
        project.getSourceFileOrThrow("foo.ts")
      );

      const gfd = new Map<string, Metadata>();
      for (const fu of [
        "/reexportAs.ts",
        "/reexportAsDefault.ts",
        "/index.ts",
        "/importFrom.ts",
        "/importFromAsType.ts",
        "/reassignThenExport.ts",
      ]) {
        gfd.set(fu, result.get(fu)!);
        result.delete(fu);
      }
      for (const [a, b] of result.entries()) {
        gfd.set(a, b);
      }

      expect(gfd).toMatchInlineSnapshot(`
        Map {
          "/reexportAs.ts" => {
            "exports": Map {},
            "imports": Map {},
            "reexports": Map {
              "foo" => {
                "exportName": "baz",
                "isType": false,
                "originFile": "/foo.ts",
              },
            },
          },
          "/reexportAsDefault.ts" => {
            "exports": Map {},
            "imports": Map {},
            "reexports": Map {
              "foo" => {
                "exportName": "default",
                "isType": false,
                "originFile": "/foo.ts",
              },
            },
          },
          "/index.ts" => {
            "exports": Map {},
            "imports": Map {},
            "reexports": Map {
              "foo" => {
                "exportName": "foo",
                "isType": false,
                "originFile": "/foo.ts",
              },
            },
          },
          "/importFrom.ts" => {
            "exports": Map {},
            "imports": Map {
              "foo" => {
                "isType": false,
                "localName": "foofoo",
                "originFile": "/foo.ts",
              },
            },
            "reexports": Map {},
          },
          "/importFromAsType.ts" => {
            "exports": Map {},
            "imports": Map {
              "foo" => {
                "isType": true,
                "localName": "foo",
                "originFile": "/foo.ts",
              },
            },
            "reexports": Map {},
          },
          "/reassignThenExport.ts" => {
            "exports": Map {
              "baz" => {
                "type": "concrete",
              },
            },
            "imports": Map {
              "foo" => {
                "isType": false,
                "localName": "foo",
                "originFile": "/foo.ts",
              },
            },
            "reexports": Map {},
          },
          "/foo.ts" => {
            "exports": Map {
              "foo" => {
                "type": "concrete",
              },
              "default" => {
                "type": "concrete",
              },
            },
            "imports": Map {},
            "reexports": Map {},
          },
        }
      `);
    });

    it("exportedType.ts", () => {
      const result = getConsumedExports(
        {
          packageName: "foo",
          packagePath: "/",
          logger: createTestLogger(),
          project,
          packageJson: {},
        },
        project.getSourceFileOrThrow("exportedType.ts")
      );

      const gfd = new Map<string, Metadata>();
      for (const fu of [
        "/exportedType.ts",
        "/index.ts",
        "/importFrom.ts",
        "/importFromAsType.ts",
      ]) {
        gfd.set(fu, result.get(fu)!);
        result.delete(fu);
      }
      for (const [a, b] of result.entries()) {
        gfd.set(a, b);
      }

      expect(gfd).toMatchInlineSnapshot(`
        Map {
          "/exportedType.ts" => {
            "exports": Map {
              "Foo" => {
                "type": "type",
              },
              "Wtf" => {
                "type": "type",
              },
            },
            "imports": Map {},
            "reexports": Map {},
          },
          "/index.ts" => {
            "exports": Map {},
            "imports": Map {},
            "reexports": Map {
              "Foo" => {
                "exportName": "Foo",
                "isType": false,
                "originFile": "/exportedType.ts",
              },
              "Wtf" => {
                "exportName": "Wtf",
                "isType": false,
                "originFile": "/exportedType.ts",
              },
            },
          },
          "/importFrom.ts" => {
            "exports": Map {},
            "imports": Map {
              "Foo" => {
                "isType": false,
                "localName": "Foo",
                "originFile": "/exportedType.ts",
              },
              "Wtf" => {
                "isType": false,
                "localName": "Wtf",
                "originFile": "/exportedType.ts",
              },
            },
            "reexports": Map {},
          },
          "/importFromAsType.ts" => {
            "exports": Map {},
            "imports": Map {
              "Foo" => {
                "isType": true,
                "localName": "Foo",
                "originFile": "/exportedType.ts",
              },
              "Wtf" => {
                "isType": true,
                "localName": "Wtf",
                "originFile": "/exportedType.ts",
              },
            },
            "reexports": Map {},
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

    const result = getConsumedExports(
      {
        packageName: "foo",
        packagePath: "/",
        logger: createTestLogger(),
        project,
        packageJson: {},
      },
      project.getSourceFileOrThrow("/workspace/foo/src/index.ts")
    );

    expect(result).toMatchInlineSnapshot(`
      Map {
        "/workspace/foo/src/index.ts" => {
          "exports": Map {},
          "imports": Map {},
          "reexports": Map {
            "foo" => {
              "exportName": "foo",
              "isType": false,
              "originFile": "/workspace/foo/src/foo.ts",
            },
          },
        },
      }
    `);
  });
});

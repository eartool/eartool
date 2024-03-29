import { createProjectForTest, createTestLogger } from "@eartool/test-utils";
import { beforeAll, describe, expect, it } from "@jest/globals";
import type { Metadata } from "@eartool/utils";
import type { Project } from "ts-morph";
import { getConsumedExports } from "./getConsumedExports.js";
import { RefactorWorkspaceBuilder } from "../test-utils/RefactorWorkspaceBuilder.js";

describe(getConsumedExports, () => {
  describe("idk", () => {
    let project: Project;
    beforeAll(async () => {
      project = await createProjectForTest({
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
        project.getSourceFileOrThrow("foo.ts"),
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
            "exports": Map {
              "baz" => {
                "indirect": false,
                "isType": false,
                "name": "baz",
                "originFile": "/foo.ts",
                "targetName": "foo",
                "type": "alias",
              },
            },
            "filePath": "/reexportAs.ts",
            "imports": Map {},
            "reexportStars": [],
            "reexports": Map {
              "foo" => {
                "exportName": [
                  "baz",
                ],
                "isType": false,
                "originFile": "/foo.ts",
              },
            },
          },
          "/reexportAsDefault.ts" => {
            "exports": Map {
              "default" => {
                "indirect": false,
                "isType": false,
                "name": "default",
                "originFile": "/foo.ts",
                "targetName": "foo",
                "type": "alias",
              },
            },
            "filePath": "/reexportAsDefault.ts",
            "imports": Map {},
            "reexportStars": [],
            "reexports": Map {
              "foo" => {
                "exportName": [
                  "default",
                ],
                "isType": false,
                "originFile": "/foo.ts",
              },
            },
          },
          "/index.ts" => {
            "exports": Map {
              "foo" => {
                "indirect": false,
                "isType": false,
                "name": "foo",
                "originFile": "/foo.ts",
                "targetName": "foo",
                "type": "alias",
              },
              "Foo" => {
                "indirect": false,
                "isType": false,
                "name": "Foo",
                "originFile": "/exportedType.ts",
                "targetName": "Foo",
                "type": "alias",
              },
              "Wtf" => {
                "indirect": false,
                "isType": false,
                "name": "Wtf",
                "originFile": "/exportedType.ts",
                "targetName": "Wtf",
                "type": "alias",
              },
            },
            "filePath": "/index.ts",
            "imports": Map {},
            "reexportStars": [],
            "reexports": Map {
              "foo" => {
                "exportName": [
                  "foo",
                ],
                "isType": false,
                "originFile": "/foo.ts",
              },
            },
          },
          "/importFrom.ts" => {
            "exports": Map {},
            "filePath": "/importFrom.ts",
            "imports": Map {
              "foofoo" => {
                "isType": false,
                "originFile": "/foo.ts",
                "targetName": "foo",
              },
            },
            "reexportStars": [],
            "reexports": Map {},
          },
          "/importFromAsType.ts" => {
            "exports": Map {},
            "filePath": "/importFromAsType.ts",
            "imports": Map {
              "foo" => {
                "isType": true,
                "originFile": "/foo.ts",
                "targetName": "foo",
              },
            },
            "reexportStars": [],
            "reexports": Map {},
          },
          "/reassignThenExport.ts" => {
            "exports": Map {
              "baz" => {
                "name": "baz",
                "originFile": "/reassignThenExport.ts",
                "type": "concrete",
              },
            },
            "filePath": "/reassignThenExport.ts",
            "imports": Map {
              "foo" => {
                "isType": false,
                "originFile": "/foo.ts",
                "targetName": "foo",
              },
            },
            "reexportStars": [],
            "reexports": Map {},
          },
          "/foo.ts" => {
            "exports": Map {
              "foo" => {
                "name": "foo",
                "originFile": "/foo.ts",
                "type": "concrete",
              },
              "default" => {
                "name": "default",
                "originFile": "/foo.ts",
                "type": "concrete",
              },
            },
            "filePath": "/foo.ts",
            "imports": Map {},
            "reexportStars": [],
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
        project.getSourceFileOrThrow("exportedType.ts"),
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
                "name": "Foo",
                "originFile": "/exportedType.ts",
                "type": "type",
              },
              "Wtf" => {
                "name": "Wtf",
                "originFile": "/exportedType.ts",
                "type": "type",
              },
            },
            "filePath": "/exportedType.ts",
            "imports": Map {},
            "reexportStars": [],
            "reexports": Map {},
          },
          "/index.ts" => {
            "exports": Map {
              "foo" => {
                "indirect": false,
                "isType": false,
                "name": "foo",
                "originFile": "/foo.ts",
                "targetName": "foo",
                "type": "alias",
              },
              "Foo" => {
                "indirect": false,
                "isType": false,
                "name": "Foo",
                "originFile": "/exportedType.ts",
                "targetName": "Foo",
                "type": "alias",
              },
              "Wtf" => {
                "indirect": false,
                "isType": false,
                "name": "Wtf",
                "originFile": "/exportedType.ts",
                "targetName": "Wtf",
                "type": "alias",
              },
            },
            "filePath": "/index.ts",
            "imports": Map {},
            "reexportStars": [],
            "reexports": Map {
              "Foo" => {
                "exportName": [
                  "Foo",
                ],
                "isType": false,
                "originFile": "/exportedType.ts",
              },
              "Wtf" => {
                "exportName": [
                  "Wtf",
                ],
                "isType": false,
                "originFile": "/exportedType.ts",
              },
            },
          },
          "/importFrom.ts" => {
            "exports": Map {},
            "filePath": "/importFrom.ts",
            "imports": Map {
              "Foo" => {
                "isType": false,
                "originFile": "/exportedType.ts",
                "targetName": "Foo",
              },
              "Wtf" => {
                "isType": false,
                "originFile": "/exportedType.ts",
                "targetName": "Wtf",
              },
            },
            "reexportStars": [],
            "reexports": Map {},
          },
          "/importFromAsType.ts" => {
            "exports": Map {},
            "filePath": "/importFromAsType.ts",
            "imports": Map {
              "Foo" => {
                "isType": true,
                "originFile": "/exportedType.ts",
                "targetName": "Foo",
              },
              "Wtf" => {
                "isType": true,
                "originFile": "/exportedType.ts",
                "targetName": "Wtf",
              },
            },
            "reexportStars": [],
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
      `,
        ).addFile(
          "src/index.ts",
          `
        export {foo} from "./foo";
      `,
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
      project.getSourceFileOrThrow("/workspace/foo/src/index.ts"),
    );

    expect(result).toMatchInlineSnapshot(`
      Map {
        "/workspace/foo/src/index.ts" => {
          "exports": Map {
            "foo" => {
              "indirect": false,
              "isType": false,
              "name": "foo",
              "originFile": "/workspace/foo/src/foo.ts",
              "targetName": "foo",
              "type": "alias",
            },
          },
          "filePath": "/workspace/foo/src/index.ts",
          "imports": Map {},
          "reexportStars": [],
          "reexports": Map {
            "foo" => {
              "exportName": [
                "foo",
              ],
              "isType": false,
              "originFile": "/workspace/foo/src/foo.ts",
            },
          },
        },
      }
    `);
  });
});

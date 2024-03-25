import { createProjectForTest, createTestLogger } from "@eartool/test-utils";
import { getAllImportsAndExports } from "@eartool/utils";
import { describe, expect, it } from "@jest/globals";

describe("getAllImportsAndExports", () => {
  it("check getAllImportsAndExports", async () => {
    const project = await createProjectForTest({
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
      "fullReexport.ts": `
      export * from "./reexportAs";
      export * as grouped from "./foo";
    `,
      "secondLevelRenamedFullReexport.ts": `
      export * as Renamed from "./fullReexport";
    `,
    });

    const result = getAllImportsAndExports({
      packageName: "foo",
      packagePath: "/",
      logger: createTestLogger(),
      project,
      packageJson: {},
    });

    expect(result).toMatchInlineSnapshot(`
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
        "/fullReexport.ts" => {
          "exports": Map {
            "baz" => {
              "indirect": true,
              "isType": false,
              "name": "baz",
              "originFile": "/foo.ts",
              "targetName": "foo",
              "type": "alias",
              "via": [
                [
                  "baz",
                  "/reexportAs.ts",
                ],
              ],
            },
            "grouped.foo" => {
              "indirect": true,
              "isType": false,
              "name": "grouped.foo",
              "originFile": "/foo.ts",
              "targetName": "foo",
              "type": "alias",
              "via": [
                [
                  "foo",
                  "/foo.ts",
                ],
              ],
            },
            "grouped.default" => {
              "indirect": true,
              "isType": false,
              "name": "grouped.default",
              "originFile": "/foo.ts",
              "targetName": "default",
              "type": "alias",
              "via": [
                [
                  "default",
                  "/foo.ts",
                ],
              ],
            },
          },
          "filePath": "/fullReexport.ts",
          "imports": Map {},
          "reexportStars": [
            {
              "as": undefined,
              "originFile": "/reexportAs.ts",
            },
            {
              "as": "grouped",
              "originFile": "/foo.ts",
            },
          ],
          "reexports": Map {},
        },
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
        "/importFrom.ts" => {
          "exports": Map {},
          "filePath": "/importFrom.ts",
          "imports": Map {
            "foofoo" => {
              "isType": false,
              "originFile": "/foo.ts",
              "targetName": "foo",
            },
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
            "foo" => {
              "isType": true,
              "originFile": "/foo.ts",
              "targetName": "foo",
            },
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
        "/importFromIndirection.ts" => {
          "exports": Map {},
          "filePath": "/importFromIndirection.ts",
          "imports": Map {
            "fooByAnotherName" => {
              "isType": false,
              "originFile": "/reexportAsDefault.ts",
              "targetName": "default",
            },
          },
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
            "foo" => {
              "exportName": [
                "foo",
              ],
              "isType": false,
              "originFile": "/foo.ts",
            },
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
        "/secondLevelRenamedFullReexport.ts" => {
          "exports": Map {
            "Renamed.baz" => {
              "indirect": true,
              "isType": false,
              "name": "Renamed.baz",
              "originFile": "/foo.ts",
              "targetName": "foo",
              "type": "alias",
              "via": [
                [
                  "baz",
                  "/fullReexport.ts",
                ],
                [
                  "baz",
                  "/reexportAs.ts",
                ],
              ],
            },
            "Renamed.grouped.foo" => {
              "indirect": true,
              "isType": false,
              "name": "Renamed.grouped.foo",
              "originFile": "/foo.ts",
              "targetName": "foo",
              "type": "alias",
              "via": [
                [
                  "grouped.foo",
                  "/fullReexport.ts",
                ],
                [
                  "foo",
                  "/foo.ts",
                ],
              ],
            },
            "Renamed.grouped.default" => {
              "indirect": true,
              "isType": false,
              "name": "Renamed.grouped.default",
              "originFile": "/foo.ts",
              "targetName": "default",
              "type": "alias",
              "via": [
                [
                  "grouped.default",
                  "/fullReexport.ts",
                ],
                [
                  "default",
                  "/foo.ts",
                ],
              ],
            },
          },
          "filePath": "/secondLevelRenamedFullReexport.ts",
          "imports": Map {},
          "reexportStars": [
            {
              "as": "Renamed",
              "originFile": "/fullReexport.ts",
            },
          ],
          "reexports": Map {},
        },
      }
    `);
  });
});

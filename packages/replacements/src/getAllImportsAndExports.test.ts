import { createProjectForTest, createTestLogger } from "@eartool/test-utils";
import { getAllImportsAndExports } from "@eartool/utils";
import { describe, expect, it } from "vitest";

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
              "targetFile": "/exportedType.ts",
              "type": "type",
            },
            "Wtf" => {
              "name": "Wtf",
              "targetFile": "/exportedType.ts",
              "type": "type",
            },
          },
          "filePath": "/exportedType.ts",
          "imports": Map {},
          "reexportStars": [],
        },
        "/foo.ts" => {
          "exports": Map {
            "foo" => {
              "name": "foo",
              "targetFile": "/foo.ts",
              "type": "concrete",
            },
            "default" => {
              "name": "default",
              "targetFile": "/foo.ts",
              "type": "concrete",
            },
          },
          "filePath": "/foo.ts",
          "imports": Map {},
          "reexportStars": [],
        },
        "/fullReexport.ts" => {
          "exports": Map {
            "baz" => {
              "indirect": true,
              "isType": false,
              "name": "baz",
              "targetFile": "/foo.ts",
              "targetName": "foo",
              "type": "alias",
              "via": {
                "name": "foo",
                "targetFile": "/foo.ts",
                "type": "concrete",
              },
            },
            "grouped.foo" => {
              "indirect": true,
              "isType": false,
              "name": "grouped.foo",
              "targetFile": "/foo.ts",
              "targetName": "foo",
              "type": "alias",
              "via": {
                "name": "foo",
                "targetFile": "/foo.ts",
                "type": "concrete",
              },
            },
            "grouped.default" => {
              "indirect": true,
              "isType": false,
              "name": "grouped.default",
              "targetFile": "/foo.ts",
              "targetName": "default",
              "type": "alias",
              "via": {
                "name": "default",
                "targetFile": "/foo.ts",
                "type": "concrete",
              },
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
        },
        "/reexportAs.ts" => {
          "exports": Map {
            "baz" => {
              "indirect": false,
              "isType": false,
              "name": "baz",
              "targetFile": "/foo.ts",
              "targetName": "foo",
              "type": "alias",
              "via": {
                "name": "foo",
                "targetFile": "/foo.ts",
                "type": "concrete",
              },
            },
          },
          "filePath": "/reexportAs.ts",
          "imports": Map {},
          "reexportStars": [],
        },
        "/importFrom.ts" => {
          "exports": Map {},
          "filePath": "/importFrom.ts",
          "imports": Map {
            "foofoo" => {
              "isType": false,
              "moduleSpecifier": "./foo",
              "name": "foofoo",
              "targetFile": "/foo.ts",
              "targetName": "foo",
              "type": "import",
              "via": {
                "name": "foo",
                "targetFile": "/foo.ts",
                "type": "concrete",
              },
            },
            "Foo" => {
              "isType": false,
              "moduleSpecifier": "./exportedType",
              "name": "Foo",
              "targetFile": "/exportedType.ts",
              "targetName": "Foo",
              "type": "import",
              "via": {
                "name": "Foo",
                "targetFile": "/exportedType.ts",
                "type": "type",
              },
            },
            "Wtf" => {
              "isType": false,
              "moduleSpecifier": "./exportedType",
              "name": "Wtf",
              "targetFile": "/exportedType.ts",
              "targetName": "Wtf",
              "type": "import",
              "via": {
                "name": "Wtf",
                "targetFile": "/exportedType.ts",
                "type": "type",
              },
            },
          },
          "reexportStars": [],
        },
        "/importFromAsType.ts" => {
          "exports": Map {},
          "filePath": "/importFromAsType.ts",
          "imports": Map {
            "foo" => {
              "isType": true,
              "moduleSpecifier": "./foo",
              "name": "foo",
              "targetFile": "/foo.ts",
              "targetName": "foo",
              "type": "import",
              "via": {
                "name": "foo",
                "targetFile": "/foo.ts",
                "type": "concrete",
              },
            },
            "Foo" => {
              "isType": true,
              "moduleSpecifier": "./exportedType",
              "name": "Foo",
              "targetFile": "/exportedType.ts",
              "targetName": "Foo",
              "type": "import",
              "via": {
                "name": "Foo",
                "targetFile": "/exportedType.ts",
                "type": "type",
              },
            },
            "Wtf" => {
              "isType": true,
              "moduleSpecifier": "./exportedType",
              "name": "Wtf",
              "targetFile": "/exportedType.ts",
              "targetName": "Wtf",
              "type": "import",
              "via": {
                "name": "Wtf",
                "targetFile": "/exportedType.ts",
                "type": "type",
              },
            },
          },
          "reexportStars": [],
        },
        "/importFromIndirection.ts" => {
          "exports": Map {},
          "filePath": "/importFromIndirection.ts",
          "imports": Map {
            "fooByAnotherName" => {
              "finalDest": {
                "name": "foo",
                "targetFile": "/foo.ts",
                "type": "concrete",
              },
              "isType": false,
              "moduleSpecifier": "./reexportAsDefault",
              "name": "fooByAnotherName",
              "targetFile": "/reexportAsDefault.ts",
              "targetName": "default",
              "type": "import",
              "via": {
                "indirect": false,
                "isType": false,
                "name": "default",
                "targetFile": "/foo.ts",
                "targetName": "foo",
                "type": "alias",
                "via": {
                  "name": "foo",
                  "targetFile": "/foo.ts",
                  "type": "concrete",
                },
              },
            },
          },
          "reexportStars": [],
        },
        "/index.ts" => {
          "exports": Map {
            "foo" => {
              "indirect": false,
              "isType": false,
              "name": "foo",
              "targetFile": "/foo.ts",
              "targetName": "foo",
              "type": "alias",
              "via": {
                "name": "foo",
                "targetFile": "/foo.ts",
                "type": "concrete",
              },
            },
            "Foo" => {
              "indirect": false,
              "isType": false,
              "name": "Foo",
              "targetFile": "/exportedType.ts",
              "targetName": "Foo",
              "type": "alias",
              "via": {
                "name": "Foo",
                "targetFile": "/exportedType.ts",
                "type": "type",
              },
            },
            "Wtf" => {
              "indirect": false,
              "isType": false,
              "name": "Wtf",
              "targetFile": "/exportedType.ts",
              "targetName": "Wtf",
              "type": "alias",
              "via": {
                "name": "Wtf",
                "targetFile": "/exportedType.ts",
                "type": "type",
              },
            },
          },
          "filePath": "/index.ts",
          "imports": Map {},
          "reexportStars": [],
        },
        "/reassignThenExport.ts" => {
          "exports": Map {
            "baz" => {
              "name": "baz",
              "targetFile": "/reassignThenExport.ts",
              "type": "concrete",
            },
          },
          "filePath": "/reassignThenExport.ts",
          "imports": Map {
            "foo" => {
              "isType": false,
              "moduleSpecifier": "./foo",
              "name": "foo",
              "targetFile": "/foo.ts",
              "targetName": "foo",
              "type": "import",
              "via": {
                "name": "foo",
                "targetFile": "/foo.ts",
                "type": "concrete",
              },
            },
          },
          "reexportStars": [],
        },
        "/reexportAsDefault.ts" => {
          "exports": Map {
            "default" => {
              "indirect": false,
              "isType": false,
              "name": "default",
              "targetFile": "/foo.ts",
              "targetName": "foo",
              "type": "alias",
              "via": {
                "name": "foo",
                "targetFile": "/foo.ts",
                "type": "concrete",
              },
            },
          },
          "filePath": "/reexportAsDefault.ts",
          "imports": Map {},
          "reexportStars": [],
        },
        "/secondLevelRenamedFullReexport.ts" => {
          "exports": Map {
            "Renamed.baz" => {
              "indirect": true,
              "isType": false,
              "name": "Renamed.baz",
              "targetFile": "/foo.ts",
              "targetName": "foo",
              "type": "alias",
              "via": {
                "name": "foo",
                "targetFile": "/foo.ts",
                "type": "concrete",
              },
            },
            "Renamed.grouped.foo" => {
              "indirect": true,
              "isType": false,
              "name": "Renamed.grouped.foo",
              "targetFile": "/foo.ts",
              "targetName": "foo",
              "type": "alias",
              "via": {
                "name": "foo",
                "targetFile": "/foo.ts",
                "type": "concrete",
              },
            },
            "Renamed.grouped.default" => {
              "indirect": true,
              "isType": false,
              "name": "Renamed.grouped.default",
              "targetFile": "/foo.ts",
              "targetName": "default",
              "type": "alias",
              "via": {
                "name": "default",
                "targetFile": "/foo.ts",
                "type": "concrete",
              },
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
        },
      }
    `);
  });
});

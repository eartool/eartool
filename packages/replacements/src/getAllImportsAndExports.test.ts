import { createProjectForTest, createTestLogger } from "@eartool/test-utils";
import { getAllImportsAndExports } from "@eartool/utils";
import { describe, expect, it } from "@jest/globals";

describe(getAllImportsAndExports, () => {
  it("idk", () => {
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

    const result = getAllImportsAndExports({
      packageName: "foo",
      packagePath: "/",
      logger: createTestLogger(),
      project,
    });

    expect(result).toMatchInlineSnapshot(`
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
          "/importFrom.ts" => {
            "exports": Map {},
            "imports": Map {
              "foo" => {
                "isType": false,
                "localName": "foofoo",
                "originFile": "/foo.ts",
              },
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
              "foo" => {
                "isType": true,
                "localName": "foo",
                "originFile": "/foo.ts",
              },
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
          "/importFromIndirection.ts" => {
            "exports": Map {},
            "imports": Map {
              "default" => {
                "isType": false,
                "localName": "fooByAnotherName",
                "originFile": "/reexportAsDefault.ts",
              },
            },
            "reexports": Map {},
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
        }
      `);
  });
});

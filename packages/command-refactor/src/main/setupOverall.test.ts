import { describe, expect, it } from "@jest/globals";
import { createTestLogger } from "@eartool/test-utils";
import { createInitialWorkspaceBuilder } from "../test-utils/createInitialWorkspaceBuilder.js";
import { setupOverall } from "./setupOverall.js";

describe(setupOverall, () => {
  describe("simple cases", () => {
    it("pulls upstream", async () => {
      const { workspace, projectLoader } = createInitialWorkspaceBuilder().build();

      const result = await setupOverall(
        workspace,
        projectLoader,
        new Set(["/workspace/api/src/doThingWithState.ts"]),
        "state",
        createTestLogger(),
      );

      expect(result).toMatchInlineSnapshot(`
        {
          "direction": "upstream",
          "packageExportRenamesMap": Map {
            "api" => [
              {
                "from": [
                  "doThingWithState",
                ],
                "toFileOrModule": "state",
              },
            ],
            "/workspace/api/src/doThingWithState.ts" => [
              {
                "from": [
                  "doThingWithState",
                ],
                "toFileOrModule": "state",
              },
            ],
          },
          "packageJsonDepsRequired": {
            "dependencies": Map {
              "util" => "workspace:*",
              "state" => "workspace:*",
            },
            "devDependencies": Map {},
          },
          "packageNameToFilesToMove": SetMultimap {
            "map": Map {
              "api" => Set {
                "/workspace/api/src/doThingWithState.ts",
              },
            },
            "operator": SetOperator {},
            "size_": 1,
          },
          "primaryPackages": Set {
            "api",
            "state",
          },
          "relativeFileInfoMap": Map {
            "src/doThingWithState.ts" => {
              "fileContents": "
                    import {identity} from "util";
                    import {State} from "state";
                    export function doThingWithState(state: State) { return identity(state.foo); }
                  ",
              "rootExports": Map {
                "doThingWithState" => {
                  "exportName": [
                    "doThingWithState",
                  ],
                  "isType": false,
                },
              },
            },
          },
        }
      `);
    });
    it("correctly reexports from new home even if not exported from original home", async () => {
      const { workspace, projectLoader } = createInitialWorkspaceBuilder().build();

      const result = await setupOverall(
        workspace,
        projectLoader,
        new Set(["/workspace/oversized/src/components/nested/icons/word.ts"]),
        "other",
        createTestLogger(),
      );

      expect(result).toMatchInlineSnapshot(`
        {
          "direction": "sideways",
          "packageExportRenamesMap": Map {
            "/workspace/oversized/src/components/nested/icons/word.ts" => [
              {
                "from": [
                  "word",
                ],
                "toFileOrModule": "other",
              },
            ],
          },
          "packageJsonDepsRequired": {
            "dependencies": Map {},
            "devDependencies": Map {},
          },
          "packageNameToFilesToMove": SetMultimap {
            "map": Map {
              "oversized" => Set {
                "/workspace/oversized/src/components/nested/icons/word.ts",
              },
            },
            "operator": SetOperator {},
            "size_": 1,
          },
          "primaryPackages": Set {
            "oversized",
            "other",
          },
          "relativeFileInfoMap": Map {
            "src/components/nested/icons/word.ts" => {
              "fileContents": "
                export const word = "hi";
              ",
              "rootExports": Map {
                "word" => {
                  "exportName": [
                    "word",
                  ],
                  "isType": false,
                },
              },
            },
          },
        }
      `);
    });

    it("fails instead of creating a circular reference", async () => {
      const { workspace, projectLoader } = createInitialWorkspaceBuilder().build();

      expect(
        setupOverall(
          workspace,
          projectLoader,
          new Set(["/workspace/app/src/helper/prepareTest.ts"]),
          "test-utils",
          createTestLogger(),
        ),
      ).rejects.toMatchInlineSnapshot(
        `[Error: Cannot complete task. It would create a circular dependency as the destination 'test-utils' is upstream of a dependency it would have to take: 'state']`,
      );
    });

    it("pushes downstream", async () => {
      const { workspace, projectLoader } = createInitialWorkspaceBuilder().build();

      const result = await setupOverall(
        workspace,
        projectLoader,
        new Set(["/workspace/api/src/doThingWithState.ts"]),
        "app",
        createTestLogger(),
      );
      expect(result).toMatchInlineSnapshot(`
        {
          "direction": "downstream",
          "packageExportRenamesMap": Map {
            "api" => [
              {
                "from": [
                  "doThingWithState",
                ],
                "toFileOrModule": "app",
              },
            ],
            "/workspace/api/src/doThingWithState.ts" => [
              {
                "from": [
                  "doThingWithState",
                ],
                "toFileOrModule": "app",
              },
            ],
          },
          "packageJsonDepsRequired": {
            "dependencies": Map {
              "util" => "workspace:*",
              "state" => "workspace:*",
            },
            "devDependencies": Map {},
          },
          "packageNameToFilesToMove": SetMultimap {
            "map": Map {
              "api" => Set {
                "/workspace/api/src/doThingWithState.ts",
              },
            },
            "operator": SetOperator {},
            "size_": 1,
          },
          "primaryPackages": Set {
            "api",
            "app",
          },
          "relativeFileInfoMap": Map {
            "src/doThingWithState.ts" => {
              "fileContents": "
                    import {identity} from "util";
                    import {State} from "state";
                    export function doThingWithState(state: State) { return identity(state.foo); }
                  ",
              "rootExports": Map {
                "doThingWithState" => {
                  "exportName": [
                    "doThingWithState",
                  ],
                  "isType": false,
                },
              },
            },
          },
        }
      `);
    });
  });

  describe("with collatoral damage", () => {
    it("pulls up stream", async () => {
      const { workspace, projectLoader } = createInitialWorkspaceBuilder().build();

      const result = await setupOverall(
        workspace,
        projectLoader,
        new Set(["/workspace/api/src/doThingWithBaz.ts"]),
        "state",
        createTestLogger(),
      );

      expect(result).toMatchInlineSnapshot(`
        {
          "direction": "upstream",
          "packageExportRenamesMap": Map {
            "api" => [
              {
                "from": [
                  "doThingWithBaz",
                ],
                "toFileOrModule": "state",
              },
              {
                "from": [
                  "Baz",
                ],
                "toFileOrModule": "state",
              },
            ],
            "/workspace/api/src/Baz.ts" => [
              {
                "from": [
                  "Baz",
                ],
                "toFileOrModule": "state",
              },
              {
                "from": [
                  "BazConst",
                ],
                "toFileOrModule": "state",
              },
            ],
          },
          "packageJsonDepsRequired": {
            "dependencies": Map {},
            "devDependencies": Map {},
          },
          "packageNameToFilesToMove": SetMultimap {
            "map": Map {
              "api" => Set {
                "/workspace/api/src/doThingWithBaz.ts",
                "/workspace/api/src/Baz.ts",
              },
            },
            "operator": SetOperator {},
            "size_": 2,
          },
          "primaryPackages": Set {
            "api",
            "state",
          },
          "relativeFileInfoMap": Map {
            "src/doThingWithBaz.ts" => {
              "fileContents": "
                    import {type Baz, BazConst} from "./Baz";
                    export function doThingWithBaz(baz: Baz) { return baz.value + BazConst; }
                  ",
              "rootExports": Map {
                "doThingWithBaz" => {
                  "exportName": [
                    "doThingWithBaz",
                  ],
                  "isType": false,
                  "originFile": "/workspace/api/src/doThingWithBaz.ts",
                },
              },
            },
            "src/Baz.ts" => {
              "fileContents": "
                      export interface Baz { value: string }
                      export const BazConst = 5;
                    ",
              "rootExports": Map {
                "Baz" => {
                  "exportName": [
                    "Baz",
                  ],
                  "isType": false,
                },
                "BazConst" => {
                  "exportName": [
                    "BazConst",
                  ],
                  "isType": false,
                },
              },
            },
          },
        }
      `);
    });
  });
});

function objToMap<K extends string, V>(a: Record<K, V>) {
  return new Map(Object.entries(a)) as Map<K, V>;
}

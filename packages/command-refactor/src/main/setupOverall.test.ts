import { describe, expect, it } from "@jest/globals";
import { setupOverall } from "./setupOverall.js";
import { createTestLogger } from "@eartool/test-utils";
import { createInitialWorkspaceBuilder } from "../test-utils/createInitialWorkspaceBuilder.js";

describe(setupOverall, () => {
  describe("simple cases", () => {
    it("pulls upstream", async () => {
      const { workspace, projectLoader } = createInitialWorkspaceBuilder().build();

      const result = await setupOverall(
        workspace,
        projectLoader,
        new Set(["/workspace/api/src/doThingWithState.ts"]),
        "state",
        createTestLogger()
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
                "doThingWithState" => "doThingWithState",
              },
            },
          },
        }
      `);
    });

    it("pushes downstream", async () => {
      const { workspace, projectLoader } = createInitialWorkspaceBuilder().build();

      const result = await setupOverall(
        workspace,
        projectLoader,
        new Set(["/workspace/api/src/doThingWithState.ts"]),
        "app",
        createTestLogger()
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
                "doThingWithState" => "doThingWithState",
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
        createTestLogger()
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
                    import {Baz} from "./Baz";
                    export function doThingWithBaz(baz: Baz) { return baz.value; }
                  ",
              "rootExports": Map {
                "doThingWithBaz" => "doThingWithBaz",
              },
            },
            "src/Baz.ts" => {
              "fileContents": "
                      export interface Baz { value: string }
                    ",
              "rootExports": Map {
                "Baz" => "Baz",
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

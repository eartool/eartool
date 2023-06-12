import { describe, expect, it } from "@jest/globals";
import { WorkspaceBuilder } from "../test-utils/WorkspaceBuilder.js";
import { setupOverall } from "./setupOverall.js";
import { createTestLogger } from "@eartool/test-utils";

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

function createInitialWorkspaceBuilder() {
  // app -> api -> state
  // app -> state
  return new WorkspaceBuilder("/workspace/")
    .createProject("state", (p) => {
      p.addFile(
        "src/index.ts",
        `
             export {State} from "./state";
          `
      ).addFile(
        "src/state.ts",
        `
            export interface State {
              foo: number
            }
          `
      );
    })
    .createProject("util", (p) => {
      p.addFile(
        "src/index.ts",
        `
        export function identity(a: any){ return a; }
      `
      );
    })
    .createProject("api", (p) => {
      p.addFile(
        "src/index.ts",
        `
            export {doThingWithBaz} from "./doThingWithBaz.ts";
            export {doThingWithState} from "./doThingWithState.ts";
            export {Baz} from "./Baz.ts";
          `
      )
        .addFile(
          "src/Baz.ts",
          `
              export interface Baz { value: string }
            `
        )
        .addFile(
          "src/doThingWithBaz.ts",
          `
            import {Baz} from "./Baz";
            export function doThingWithBaz(baz: Baz) { return baz.value; }
          `
        )
        .addFile(
          "src/alsoUsesBaz.ts",
          `import {Baz} from "./Baz"; function alsoUsesBaz(baz: Baz) { return baz.value; }`
        )
        .addFile(
          "src/doThingWithState.ts",
          `
            import {identity} from "util";
            import {State} from "state";
            export function doThingWithState(state: State) { return identity(state.foo); }
          `
        )
        .addDependency("state")
        .addDependency("util");
      //
    })
    .createProject("app", (p) => {
      p.addFile(
        "src/cli.ts",
        `
            import {doThingWithState} from "api";
            import {State} from "state";

            print(doThingWithState({foo : 5}));
          `
      )
        .addDependency("state")
        .addDependency("api");
    });
}

function objToMap<K extends string, V>(a: Record<K, V>) {
  return new Map(Object.entries(a)) as Map<K, V>;
}

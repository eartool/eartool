import { describe, expect, it } from "@jest/globals";
import { WorkspaceBuilder } from "./WorkspaceBuilder.js";
import { setupOverall } from "./setupOverall.js";
import { createTestLogger } from "@eartool/test-utils";

describe(setupOverall, () => {
  describe("simple cases", () => {
    it("pulls up stream", async () => {
      const { workspace, projectLoader } = createInitialWorkspaceBuilder().build();

      const { fileContents, rootExportsToMove } = await setupOverall(
        workspace,
        projectLoader,
        new Set(["/workspace/api/src/doThingWithState.ts"]),
        "state",
        createTestLogger()
      );

      expect(rootExportsToMove).toEqual(
        objToMap({
          api: [{ from: ["doThingWithState"], toFileOrModule: "state" }],
        })
      );
    });

    it("pushes down stream", async () => {
      const { workspace, projectLoader } = createInitialWorkspaceBuilder().build();

      const { fileContents, rootExportsToMove, packageJsonDepsRequired } = await setupOverall(
        workspace,
        projectLoader,
        new Set(["/workspace/api/src/doThingWithState.ts"]),
        "app",
        createTestLogger()
      );

      expect(rootExportsToMove).toEqual(
        objToMap({
          api: [{ from: ["doThingWithState"], toFileOrModule: "app" }],
        })
      );

      expect([...fileContents.keys()]).toEqual(["src/doThingWithState.ts"]);
      expect(packageJsonDepsRequired.dependencies).toEqual(
        new Map([
          ["state", "workspace:*"],
          ["util", "workspace:*"],
        ])
      );
    });
  });

  describe("with collatoral damage", () => {
    it("pulls up stream", async () => {
      const { workspace, projectLoader } = createInitialWorkspaceBuilder().build();

      const { fileContents, rootExportsToMove } = await setupOverall(
        workspace,
        projectLoader,
        new Set(["/workspace/api/src/doThingWithBaz.ts"]),
        "state",
        createTestLogger()
      );

      expect(rootExportsToMove).toEqual(
        objToMap({
          api: [
            { from: ["doThingWithBaz"], toFileOrModule: "state" },
            { from: ["Baz"], toFileOrModule: "state" },
          ],
        })
      );

      expect([...fileContents.keys()]).toEqual(["src/doThingWithBaz.ts", "src/Baz.ts"]);
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
      );
    });
}

function objToMap<K extends string, V>(a: Record<K, V>) {
  return new Map(Object.entries(a)) as Map<K, V>;
}

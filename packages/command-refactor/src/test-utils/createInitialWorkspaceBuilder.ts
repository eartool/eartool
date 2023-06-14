import { WorkspaceBuilder } from "./WorkspaceBuilder.js";

export function createInitialWorkspaceBuilder() {
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
            export {doThingWithBaz} from "./doThingWithBaz";
            export {doThingWithState} from "./doThingWithState";
            export {selectA} from "./selectA"
            export {Baz} from "./Baz";
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
          `
            import {Baz} from "./Baz"; 
            function alsoUsesBaz(baz: Baz) { return baz.value; }
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
        .addFile(
          "src/selectA.ts",
          `
          import {doThingWithState} from "./doThingWithState";

          export function selectA(state: State) { return doThingWithState(state); }
        `
        )
        .addDependency("state")
        .addDependency("util");
      //
    })
    .createProject("app", (p) => {
      p.addFile(
        "src/index.ts",
        `
        export {};
      `
      );
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
    })
    .createProject("other", (p) => {
      p.addFile(
        "src/index.ts",
        `
        export {};
      `
      );
    })
    .createProject("oversized", (p) => {
      p.addFile(
        "src/index.ts",
        `
        export {Icon} from "./components/nested/Icon.tsx";
        export {Preview} from "./components/nested/Preview.tsx";
      `
      )
        .addFile(
          "src/components/nested/Icon.tsx",
          `
        import {word} from "./icons/word";
        export function Icon() { return <div>Icon</div>; }
      `
        )
        .addFile(
          "src/components/nested/icons/word.ts",
          `
        export const word = "hi";
      `
        )
        .addFile(
          "src/components/nested/Preview.tsx",
          `
        import {Icon} from "./Icon";
        export function Preview() { return <Icon/>; }
      `
        );
    });
}

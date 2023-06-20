import { WorkspaceBuilder } from "./WorkspaceBuilder.js";

export function createInitialWorkspaceBuilder(esm = false) {
  // app -> api -> state
  // app -> state

  const ext = esm ? ".js" : "";

  return new WorkspaceBuilder("/workspace/")
    .createProject("state", { esm }, (p) => {
      p.addFile(
        "src/index.ts",
        `
             export {State} from "./state${ext}";
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
    .createProject("util", { esm }, (p) => {
      p.addFile(
        "src/index.ts",
        `
        export function identity(a: any){ return a; }
      `
      );
    })
    .createProject("api", { esm }, (p) => {
      p.addFile(
        "src/index.ts",
        `
            export {doThingWithBaz} from "./doThingWithBaz${ext}";
            export {doThingWithState} from "./doThingWithState${ext}";
            export {selectA} from "./selectA${ext}"
            export {Baz} from "./Baz${ext}";
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
            import {Baz} from "./Baz${ext}";
            export function doThingWithBaz(baz: Baz) { return baz.value; }
          `
        )
        .addFile(
          "src/alsoUsesBaz.ts",
          `
            import {Baz} from "./Baz${ext}"; 
            function alsoUsesBaz(baz: Baz) { return baz.value; }
          `
        )
        .addFile(
          "src/doThingWithState.ts",
          // NOTE THIS HAS NO LINE BREAK BETWEEN IMPORT AND EXPORT FUNC
          `
            import {identity} from "util";
            import {State} from "state";
            export function doThingWithState(state: State) { return identity(state.foo); }
          `
        )
        .addFile(
          "src/selectA.ts",
          `
          import {doThingWithState} from "./doThingWithState${ext}";

          export function selectA(state: State) { return doThingWithState(state); }
        `
        )
        .addDependency("state")
        .addDependency("util");
      //
    })
    .createProject("app", { esm }, (p) => {
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
    .createProject("other", { esm }, (p) => {
      p.addFile(
        "src/index.ts",
        `
        export {};
      `
      );
    })
    .createProject("oversized", { esm }, (p) => {
      p.addFile(
        "src/index.ts",
        `
        export {Icon} from "./components/nested/Icon${ext}";
        export {Preview} from "./components/nested/Preview${ext}";
      `
      )
        .addFile(
          "src/components/nested/Icon.tsx",
          `
        import {word} from "./icons/word${ext}";
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
        import {Icon} from "./Icon${ext}";
        export function Preview() { return <Icon/>; }
      `
        );
    });
}

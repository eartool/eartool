import { createTestLogger } from "@eartool/test-utils";
import type { FilePath, PackageName } from "@eartool/utils";
import { describe, expect, it } from "@jest/globals";
import type { Logger } from "pino";
import { getJobArgs } from "../main/getJobArgs.js";
import { setupOverall } from "../main/setupOverall.js";
import { createInitialWorkspaceBuilder } from "../test-utils/createInitialWorkspaceBuilder.js";
import { processPackageReplacements } from "./processPackageReplacements.js";
import type { PackageRelativeHelpers } from "./PackageRelativeHelpers.js";
import { createCtxHelperFunctions } from "./createCtxHelperFunctions.js";

describe(processPackageReplacements, () => {
  describe("commonjs: ", () => {
    describe("word -> other", () => {
      const destination = "other";
      const filesToMove = new Set(["/workspace/oversized/src/components/nested/icons/word.ts"]);

      it("includes the new export in the moved package", async () => {
        // This test moves a file that is not exported to a new place and needs to export it
        // from the new place even though the old place did not!
        const result = await standardSetup(filesToMove, destination, false);
        const { filesChanged, helpers } = await standardProcessPackageReplacmements(
          result,
          "other",
        );

        expect(await helpers.getTestResultsForFiles(filesChanged)).toMatchInlineSnapshot(`
                  "// ==========================================================
                  // <>: /workspace/other/src/index.ts
                  //

                  export {};
                  export { word } from "./components/nested/icons/word";

                  //
                  // </>: /workspace/other/src/index.ts
                  // ==========================================================
                  "
              `);
      });
    }),
      describe("Icon -> other", () => {
        const destination = "other";
        const filesToMove = new Set(["/workspace/oversized/src/components/nested/Icon.tsx"]);

        it("updates oversized properly", async () => {
          const result = await standardSetup(filesToMove, destination, false);
          const { filesChanged, helpers } = await standardProcessPackageReplacmements(
            result,
            "oversized",
          );

          expect(await helpers.getTestResultsForFiles(filesChanged)).toMatchInlineSnapshot(`
                      "// ==========================================================
                      // <>: /workspace/oversized/src/index.ts
                      //

                      export { Preview } from "./components/nested/Preview";

                      //
                      // </>: /workspace/oversized/src/index.ts
                      // ==========================================================

                      // ==========================================================
                      // <>: /workspace/oversized/src/components/nested/Preview.tsx
                      //

                      import { Icon } from "other";
                      export function Preview() {
                        return <Icon />;
                      }

                      //
                      // </>: /workspace/oversized/src/components/nested/Preview.tsx
                      // ==========================================================

                      // ==========================================================
                      // <>: /workspace/oversized/src/components/nested/Icon.tsx
                      //

                      // FILE DOES NOT EXIST

                      //
                      // </>: /workspace/oversized/src/components/nested/Icon.tsx
                      // ==========================================================

                      // ==========================================================
                      // <>: /workspace/oversized/src/components/nested/icons/word.ts
                      //

                      // FILE DOES NOT EXIST

                      //
                      // </>: /workspace/oversized/src/components/nested/icons/word.ts
                      // ==========================================================
                      "
                  `);
        });
      });

    describe("[doThingWithState -> state]", () => {
      const destination = "state";
      const filesToMove = new Set(["/workspace/api/src/doThingWithState.ts"]);

      it("handles api project properly", async () => {
        const result = await standardSetup(filesToMove, destination, false);

        const { filesChanged, helpers } = await standardProcessPackageReplacmements(result, "api");

        expect(await helpers.getTestResultsForFiles(filesChanged)).toMatchInlineSnapshot(`
                  "// ==========================================================
                  // <>: /workspace/api/src/index.ts
                  //

                  export { doThingWithBaz } from "./doThingWithBaz";
                  export { selectA } from "./selectA";
                  export { Baz } from "./Baz";

                  //
                  // </>: /workspace/api/src/index.ts
                  // ==========================================================

                  // ==========================================================
                  // <>: /workspace/api/src/selectA.ts
                  //

                  import { doThingWithState } from "state";

                  export function selectA(state: State) {
                    return doThingWithState(state);
                  }

                  //
                  // </>: /workspace/api/src/selectA.ts
                  // ==========================================================

                  // ==========================================================
                  // <>: /workspace/api/src/doThingWithState.ts
                  //

                  // FILE DOES NOT EXIST

                  //
                  // </>: /workspace/api/src/doThingWithState.ts
                  // ==========================================================
                  "
              `);
      });

      it("handles state project properly", async () => {
        const result = await standardSetup(filesToMove, destination, false);

        const { filesChanged, helpers } = await standardProcessPackageReplacmements(
          result,
          "state",
        );

        // NOTE THE ORIGINAL HAS NO NEW LINE BETWEEN the import and the export in doThingWithState.ts
        expect(await helpers.getTestResultsForFiles(filesChanged)).toMatchInlineSnapshot(`
          "// ==========================================================
          // <>: /workspace/state/src/doThingWithState.ts
          //

          import { identity } from "util";
          import { State } from "./state";
          export function doThingWithState(state: State) {
            return identity(state.foo);
          }

          //
          // </>: /workspace/state/src/doThingWithState.ts
          // ==========================================================

          // ==========================================================
          // <>: /workspace/state/src/index.ts
          //

          export type { State } from "./state";
          export { doThingWithState } from "./doThingWithState";

          //
          // </>: /workspace/state/src/index.ts
          // ==========================================================
          "
        `);
      });

      it("handles app project properly", async () => {
        const result = await standardSetup(filesToMove, destination, false);

        const { filesChanged, helpers } = await standardProcessPackageReplacmements(result, "app");

        expect(await helpers.getTestResultsForFiles(filesChanged)).toMatchInlineSnapshot(`
                  "// ==========================================================
                  // <>: /workspace/app/src/cli.ts
                  //

                  import { doThingWithState } from "state";
                  import { State } from "state";

                  print(doThingWithState({ foo: 5 }));

                  //
                  // </>: /workspace/app/src/cli.ts
                  // ==========================================================
                  "
              `);
      });
    });
  });
  describe("esm: ", () => {
    describe("word -> other", () => {
      const destination = "other";
      const filesToMove = new Set(["/workspace/oversized/src/components/nested/icons/word.ts"]);

      it("includes the new export in the moved package", async () => {
        // This test moves a file that is not exported to a new place and needs to export it
        // from the new place even though the old place did not!
        const result = await standardSetup(filesToMove, destination, true);
        const { filesChanged, helpers } = await standardProcessPackageReplacmements(
          result,
          "other",
        );

        expect(await helpers.getTestResultsForFiles(filesChanged)).toMatchInlineSnapshot(`
                  "// ==========================================================
                  // <>: /workspace/other/src/index.ts
                  //

                  export {};
                  export { word } from "./components/nested/icons/word.js";

                  //
                  // </>: /workspace/other/src/index.ts
                  // ==========================================================
                  "
              `);
      });
    }),
      describe("Icon -> other", () => {
        const destination = "other";
        const filesToMove = new Set(["/workspace/oversized/src/components/nested/Icon.tsx"]);

        it("updates oversized properly", async () => {
          const result = await standardSetup(filesToMove, destination, true);
          const { filesChanged, helpers } = await standardProcessPackageReplacmements(
            result,
            "oversized",
          );

          expect(await helpers.getTestResultsForFiles(filesChanged)).toMatchInlineSnapshot(`
                      "// ==========================================================
                      // <>: /workspace/oversized/src/index.ts
                      //

                      export { Preview } from "./components/nested/Preview.js";

                      //
                      // </>: /workspace/oversized/src/index.ts
                      // ==========================================================

                      // ==========================================================
                      // <>: /workspace/oversized/src/components/nested/Preview.tsx
                      //

                      import { Icon } from "other";
                      export function Preview() {
                        return <Icon />;
                      }

                      //
                      // </>: /workspace/oversized/src/components/nested/Preview.tsx
                      // ==========================================================

                      // ==========================================================
                      // <>: /workspace/oversized/src/components/nested/Icon.tsx
                      //

                      // FILE DOES NOT EXIST

                      //
                      // </>: /workspace/oversized/src/components/nested/Icon.tsx
                      // ==========================================================

                      // ==========================================================
                      // <>: /workspace/oversized/src/components/nested/icons/word.ts
                      //

                      // FILE DOES NOT EXIST

                      //
                      // </>: /workspace/oversized/src/components/nested/icons/word.ts
                      // ==========================================================
                      "
                  `);
        });
      });

    describe("[doThingWithState -> state]", () => {
      const destination = "state";
      const filesToMove = new Set(["/workspace/api/src/doThingWithState.ts"]);

      it("handles api project properly", async () => {
        const result = await standardSetup(filesToMove, destination, true);

        const { filesChanged, helpers } = await standardProcessPackageReplacmements(result, "api");

        expect(await helpers.getTestResultsForFiles(filesChanged)).toMatchInlineSnapshot(`
                  "// ==========================================================
                  // <>: /workspace/api/src/index.ts
                  //

                  export { doThingWithBaz } from "./doThingWithBaz.js";
                  export { selectA } from "./selectA.js";
                  export { Baz } from "./Baz.js";

                  //
                  // </>: /workspace/api/src/index.ts
                  // ==========================================================

                  // ==========================================================
                  // <>: /workspace/api/src/selectA.ts
                  //

                  import { doThingWithState } from "state";

                  export function selectA(state: State) {
                    return doThingWithState(state);
                  }

                  //
                  // </>: /workspace/api/src/selectA.ts
                  // ==========================================================

                  // ==========================================================
                  // <>: /workspace/api/src/doThingWithState.ts
                  //

                  // FILE DOES NOT EXIST

                  //
                  // </>: /workspace/api/src/doThingWithState.ts
                  // ==========================================================
                  "
              `);
      });

      it("handles state project properly", async () => {
        const result = await standardSetup(filesToMove, destination, true);

        const { filesChanged, helpers } = await standardProcessPackageReplacmements(
          result,
          "state",
        );

        // NOTE THE ORIGINAL HAS NO NEW LINE BETWEEN the import and the export in doThingWithState.ts
        expect(await helpers.getTestResultsForFiles(filesChanged)).toMatchInlineSnapshot(`
          "// ==========================================================
          // <>: /workspace/state/src/doThingWithState.ts
          //

          import { identity } from "util";
          import { State } from "./state.js";
          export function doThingWithState(state: State) {
            return identity(state.foo);
          }

          //
          // </>: /workspace/state/src/doThingWithState.ts
          // ==========================================================

          // ==========================================================
          // <>: /workspace/state/src/index.ts
          //

          export type { State } from "./state.js";
          export { doThingWithState } from "./doThingWithState.js";

          //
          // </>: /workspace/state/src/index.ts
          // ==========================================================
          "
        `);
      });

      it("handles app project properly", async () => {
        const result = await standardSetup(filesToMove, destination, true);

        const { filesChanged, helpers } = await standardProcessPackageReplacmements(result, "app");

        expect(await helpers.getTestResultsForFiles(filesChanged)).toMatchInlineSnapshot(`
                  "// ==========================================================
                  // <>: /workspace/app/src/cli.ts
                  //

                  import { doThingWithState } from "state";
                  import { State } from "state";

                  print(doThingWithState({ foo: 5 }));

                  //
                  // </>: /workspace/app/src/cli.ts
                  // ==========================================================
                  "
              `);
      });
    });
  });
});

async function standardProcessPackageReplacmements(
  result: StandardSetupResult,
  packageName: string,
  extraPackages: string[] = [],
) {
  const ctx = result.getPackageContext(packageName);

  const jobArgs = getJobArgs(packageName, result, result.setupResults);

  const filesChanged = await processPackageReplacements(
    ctx,
    jobArgs.filesToRemove,
    jobArgs.relativeFileInfoMap,
    result.setupResults.packageExportRenamesMap,
    false,
  );

  return {
    filesChanged,
    ctx,
    helpers: createCtxHelperFunctions(ctx),
  };
}

type StandardSetupResult = ReturnType<ReturnType<typeof createInitialWorkspaceBuilder>["build"]> & {
  logger: Logger;
  setupResults: Awaited<ReturnType<typeof setupOverall>>;
  destination: PackageName;
  helpersForPackage: (packageName: string) => PackageRelativeHelpers;
  organizeImports: boolean;
};

async function standardSetup(
  filesToMove: Set<FilePath>,
  destination: PackageName,
  useEsm: boolean,
): Promise<StandardSetupResult> {
  const builtResults = createInitialWorkspaceBuilder(useEsm).build();
  const logger = createTestLogger();
  const setupResults = await setupOverall(
    builtResults.workspace,
    builtResults.projectLoader,
    filesToMove,
    destination,
    logger,
  );

  const helpersForPackage = (packageName: string) =>
    createCtxHelperFunctions(builtResults.getPackageContext(packageName));

  return {
    ...builtResults,
    logger,
    setupResults,
    destination,
    helpersForPackage,
    organizeImports: false,
  };
}

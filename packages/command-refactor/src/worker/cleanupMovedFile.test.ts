import { describe, expect, it } from "@jest/globals";
import { WorkspaceBuilder } from "@eartool/test-utils";
import { cleanupMovedFile } from "./cleanupMovedFile.js";
import { createCtxHelperFunctions } from "./createCtxHelperFunctions.js";
import { RefactorWorkspaceBuilder } from "../test-utils/RefactorWorkspaceBuilder.js";

describe(cleanupMovedFile, () => {
  it("handles imports from own package", async () => {
    const PACKAGE_NAME = "foo";

    const { workspace, projectLoader, getPackageContext } = new RefactorWorkspaceBuilder(
      "/workspace"
    )
      .createProject(PACKAGE_NAME, (p) => {
        p.addFile(
          "src/foo.ts",
          `
            import {bar, baz} from "foo";
            export const foo = bar + baz;
          `
        )
          .addFile(
            "src/bar.ts",
            `
              export const bar = 5;
              export const baz = 6;
            `
          )
          .addFile(
            "src/index.ts",
            `
              export {bar, baz} from "./bar";
            `
          );
      })
      .build();

    const ctx = getPackageContext(PACKAGE_NAME);
    const sf = ctx.project.getSourceFileOrThrow(`/workspace/${PACKAGE_NAME}/src/foo.ts`);
    cleanupMovedFile(ctx, sf);

    const { processReplacementsAndGetTestResultsForFiles } = createCtxHelperFunctions(ctx);
    const { testResults } = await processReplacementsAndGetTestResultsForFiles();
    expect(testResults).toMatchInlineSnapshot(`
      "// ==========================================================
      // <>: /workspace/foo/src/foo.ts
      //

      import { bar } from "./bar";
      import { baz } from "./bar";
      export const foo = bar + baz;

      //
      // </>: /workspace/foo/src/foo.ts
      // ==========================================================
      "
    `);
  });

  it("updates reference in target package when nested", async () => {
    const PACKAGE_NAME = "foo";

    const { workspace, projectLoader, getPackageContext } = new RefactorWorkspaceBuilder(
      "/workspace"
    )
      .createProject(PACKAGE_NAME, { esm: true }, (p) => {
        p.addFile(
          "src/foo.ts",
          `
            import {bar} from "foo";
            export const foo = bar;
          `
        )
          .addFile(
            "src/nested/bar.ts",
            `
              export const bar = 5;
            `
          )
          .addFile(
            "src/index.ts",
            `
              export {bar} from "./nested/bar.js";
            `
          );
      })
      .build();

    const ctx = getPackageContext(PACKAGE_NAME);
    const sf = ctx.project.getSourceFileOrThrow(`/workspace/${PACKAGE_NAME}/src/foo.ts`);
    cleanupMovedFile(ctx, sf);

    const { processReplacementsAndGetTestResultsForFiles } = createCtxHelperFunctions(ctx);
    const { testResults } = await processReplacementsAndGetTestResultsForFiles();
    expect(testResults).toMatchInlineSnapshot(`
      "// ==========================================================
      // <>: /workspace/foo/src/foo.ts
      //

      import { bar } from "./nested/bar.js";
      export const foo = bar;

      //
      // </>: /workspace/foo/src/foo.ts
      // ==========================================================
      "
    `);
  });
});

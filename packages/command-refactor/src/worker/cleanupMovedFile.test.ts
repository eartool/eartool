import { processReplacements } from "@eartool/replacements";
import { formatTestTypescript } from "@eartool/test-utils";
import { describe, expect, it } from "@jest/globals";
import { WorkspaceBuilder } from "../test-utils/WorkspaceBuilder.js";
import { cleanupMovedFile } from "./cleanupMovedFile.js";

describe(cleanupMovedFile, () => {
  it("handles imports from own package", () => {
    const PACKAGE_NAME = "foo";

    const { workspace, projectLoader, getWorkerPackageContext } = new WorkspaceBuilder("/workspace")
      .createProject(PACKAGE_NAME, (p) => {
        p.addFile(
          "src/foo.ts",
          `
            import {bar} from "foo";
            export const foo = bar;
          `
        )
          .addFile(
            "src/bar.ts",
            `
              export const bar = 5;
            `
          )
          .addFile(
            "src/index.ts",
            `
              export {bar} from "./bar";
            `
          );
      })
      .build();

    const ctx = getWorkerPackageContext(PACKAGE_NAME);
    const sf = ctx.project.getSourceFileOrThrow(`/workspace/${PACKAGE_NAME}/src/foo.ts`);
    cleanupMovedFile(ctx, sf);

    processReplacements(ctx.project, ctx.replacements.getReplacementsMap());
    sf.organizeImports().saveSync();
    const text = formatTestTypescript(sf.getText());
    expect(text).toEqual(
      formatTestTypescript(`
        import { bar } from "./bar";

        export const foo = bar;
      `)
    );

    {
      const sf = ctx.project.getSourceFileOrThrow(`/workspace/${PACKAGE_NAME}/src/index.ts`);
      sf.organizeImports().saveSync();

      expect(formatTestTypescript(sf.getText())).toMatchInlineSnapshot(`
        "export { bar } from "./bar";
        "
      `);
    }
  });
});

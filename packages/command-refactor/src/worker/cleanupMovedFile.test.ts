import { SimpleReplacements, processReplacements } from "@eartool/replacements";
import { createTestLogger, formatTestTypescript } from "@eartool/test-utils";
import { describe, expect, it } from "@jest/globals";
import { WorkspaceBuilder } from "../test-utils/WorkspaceBuilder.js";
import { cleanupMovedFile } from "./cleanupMovedFile.js";

describe(cleanupMovedFile, () => {
  it("handles imports from own package", () => {
    const PACKAGE_NAME = "foo";

    const { workspace, projectLoader } = new WorkspaceBuilder("/workspace")
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

    const project = projectLoader(workspace.getPackageByNameOrThrow("foo").packagePath)!;

    const replacements = new SimpleReplacements(createTestLogger());
    const sf = project.getSourceFileOrThrow(`/workspace/${PACKAGE_NAME}/src/foo.ts`);
    cleanupMovedFile(sf, PACKAGE_NAME, replacements, true);

    processReplacements(project, replacements.getReplacementsMap());
    sf.organizeImports().saveSync();
    const text = formatTestTypescript(sf.getText());
    expect(text).toEqual(
      formatTestTypescript(`
        import { bar } from "./bar";

        export const foo = bar;
      `)
    );

    {
      const sf = project.getSourceFileOrThrow(`/workspace/${PACKAGE_NAME}/src/index.ts`);
      sf.organizeImports().saveSync();

      expect(formatTestTypescript(sf.getText())).toMatchInlineSnapshot(`
        "export { bar } from "./bar";
        "
      `);
    }
  });
});

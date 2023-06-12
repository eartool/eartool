import { SimpleReplacements, processReplacements } from "@eartool/replacements";
import { createTestLogger, formatTestTypescript } from "@eartool/test-utils";
import { describe, expect, it } from "@jest/globals";
import { WorkspaceBuilder } from "./WorkspaceBuilder.js";
import { cleanupMovedFile } from "./cleanupMovedFile.js";
import { addReplacementsForExportsFromRemovedFiles } from "./addReplacementsForExportsFromRemovedFiles.js";

describe(addReplacementsForExportsFromRemovedFiles, () => {
  it("works", () => {
    const PACKAGE_NAME = "foo";

    const { workspace, projectLoader } = new WorkspaceBuilder("/workspace")
      .createProject(PACKAGE_NAME, (p) => {
        p.addFile(
          "src/foo.ts",
          `
            export const foo = "hi";
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
              export {foo} from  "./foo";
            `
          );
      })
      .build();

    const project = projectLoader(workspace.getPackageByNameOrThrow(PACKAGE_NAME).packagePath)!;

    const replacements = new SimpleReplacements(createTestLogger());
    addReplacementsForExportsFromRemovedFiles(
      project,
      [`/workspace/${PACKAGE_NAME}/src/bar.ts`],
      replacements,
      createTestLogger()
    );

    processReplacements(project, replacements.getReplacementsMap());

    const sf = project.getSourceFileOrThrow(`/workspace/${PACKAGE_NAME}/src/index.ts`);
    sf.organizeImports().saveSync();
    const text = formatTestTypescript(sf.getText());
    expect(text).toMatchInlineSnapshot(`
      "export { foo } from "./foo";
      "
    `);
  });
});

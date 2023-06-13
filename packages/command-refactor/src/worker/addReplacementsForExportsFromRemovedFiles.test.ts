import { processReplacements } from "@eartool/replacements";
import { formatTestTypescript } from "@eartool/test-utils";
import { describe, expect, it } from "@jest/globals";
import { WorkspaceBuilder } from "../test-utils/WorkspaceBuilder.js";
import { addReplacementsForExportsFromRemovedFiles } from "./addReplacementsForExportsFromRemovedFiles.js";

describe(addReplacementsForExportsFromRemovedFiles, () => {
  it("works", () => {
    const PACKAGE_NAME = "foo";

    const { workspace, projectLoader, getWorkerPackageContext } = new WorkspaceBuilder("/workspace")
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

    const name = PACKAGE_NAME;

    const ctx = getWorkerPackageContext(name);

    addReplacementsForExportsFromRemovedFiles(ctx, [`/workspace/${PACKAGE_NAME}/src/bar.ts`]);

    processReplacements(ctx.project, ctx.replacements.getReplacementsMap());

    const sf = ctx.project.getSourceFileOrThrow(`/workspace/${PACKAGE_NAME}/src/index.ts`);
    sf.organizeImports().saveSync();
    const text = formatTestTypescript(sf.getText());
    expect(text).toMatchInlineSnapshot(`
      "export { foo } from "./foo";
      "
    `);
  });
});

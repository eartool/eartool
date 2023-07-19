import { processReplacements } from "@eartool/replacements";
import { formatTestTypescript } from "@eartool/test-utils";
import { describe, expect, it } from "@jest/globals";
import { getRootFile } from "@eartool/utils";
import { addReplacementsForExportsFromRemovedFiles } from "./addReplacementsForExportsFromRemovedFiles.js";
import { RefactorWorkspaceBuilder } from "../test-utils/RefactorWorkspaceBuilder.js";

describe(addReplacementsForExportsFromRemovedFiles, () => {
  it("works", () => {
    const PACKAGE_NAME = "foo";

    const { getPackageContext } = new RefactorWorkspaceBuilder("/workspace")
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

    const ctx = getPackageContext(name);

    addReplacementsForExportsFromRemovedFiles(
      ctx,
      [`/workspace/${PACKAGE_NAME}/src/bar.ts`],
      getRootFile(ctx.project)
    );

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

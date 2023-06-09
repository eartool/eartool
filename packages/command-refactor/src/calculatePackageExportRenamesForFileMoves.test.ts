import { describe, expect, it } from "@jest/globals";
import { calculatePackageExportRenamesForFileMoves } from "./calculatePackageExportRenamesForFileMoves.js";
import { WorkspaceBuilder } from "./WorkspaceBuilder.js";
import { createTestLogger } from "@eartool/test-utils";

describe(calculatePackageExportRenamesForFileMoves, () => {
  it("handles a named import module specifier ", () => {
    const { workspace, projectLoader } = new WorkspaceBuilder("/workspace")
      .createProject("foo", (p) => {
        p.addFile(
          "src/foo.ts",
          `
            export const foo = 5;
          `
        ).addFile(
          "src/index.ts",
          `
            export {foo} from "./foo";
          `
        );
      })
      .build();

    const project = projectLoader(workspace.getPackageByNameOrThrow("foo").packagePath)!;

    const result = calculatePackageExportRenamesForFileMoves(
      project,
      new Set(["/workspace/foo/src/foo.ts"]),
      "/workspace/foo/",
      "baz",
      "upstream",
      createTestLogger()
    );

    expect(result).toMatchInlineSnapshot(`
      {
        "allFilesToMove": Set {
          "/workspace/foo/src/foo.ts",
        },
        "packageExportRenames": [
          {
            "from": [
              "foo",
            ],
            "toFileOrModule": "baz",
          },
        ],
        "requiredPackages": Set {},
        "rootExportsPerRelativeFilePath": Map {
          "src/foo.ts" => Map {
            "foo" => "foo",
          },
        },
      }
    `);
  });

  it("drags a file with it that isn't reexported", () => {
    const { workspace, projectLoader } = new WorkspaceBuilder("/workspace")
      .createProject("foo", (p) => {
        p.addFile(
          "src/foo.ts",
          `
            import {bar} from "./bar";
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
              export {foo} from "./foo";
            `
          );
      })
      .build();

    const project = projectLoader(workspace.getPackageByNameOrThrow("foo").packagePath)!;

    const result = calculatePackageExportRenamesForFileMoves(
      project,
      new Set(["/workspace/foo/src/foo.ts"]),
      "/workspace/foo/",
      "baz",
      "upstream",
      createTestLogger()
    );

    expect(result).toMatchInlineSnapshot(`
      {
        "allFilesToMove": Set {
          "/workspace/foo/src/foo.ts",
          "/workspace/foo/src/bar.ts",
        },
        "packageExportRenames": [
          {
            "from": [
              "foo",
            ],
            "toFileOrModule": "baz",
          },
        ],
        "requiredPackages": Set {},
        "rootExportsPerRelativeFilePath": Map {
          "src/foo.ts" => Map {
            "foo" => "foo",
          },
        },
      }
    `);
  });

  it("drags a file with it that is reexported", () => {
    const { workspace, projectLoader } = new WorkspaceBuilder("/workspace")
      .createProject("foo", (p) => {
        p.addFile(
          "src/foo.ts",
          `
          import {bar} from "./bar";
          import {runAlgo} from "algolib";
          export const foo = runAlgo(bar);
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
          export {foo} from "./foo";
          export {bar as baz} from "./bar";
        `
          );
      })
      .build();

    const project = projectLoader(workspace.getPackageByNameOrThrow("foo").packagePath)!;

    const result = calculatePackageExportRenamesForFileMoves(
      project,
      new Set(["/workspace/foo/src/foo.ts"]),
      "/workspace/foo/",
      "baz",
      "upstream",
      createTestLogger()
    );

    expect(result).toMatchInlineSnapshot(`
      {
        "allFilesToMove": Set {
          "/workspace/foo/src/foo.ts",
          "/workspace/foo/src/bar.ts",
        },
        "packageExportRenames": [
          {
            "from": [
              "foo",
            ],
            "toFileOrModule": "baz",
          },
          {
            "from": [
              "baz",
            ],
            "toFileOrModule": "baz",
          },
        ],
        "requiredPackages": Set {
          "algolib",
        },
        "rootExportsPerRelativeFilePath": Map {
          "src/foo.ts" => Map {
            "foo" => "foo",
          },
          "src/bar.ts" => Map {
            "bar" => "baz",
          },
        },
      }
    `);
  });
});

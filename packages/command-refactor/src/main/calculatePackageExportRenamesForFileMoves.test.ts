import { createTestLogger, WorkspaceBuilder } from "@eartool/test-utils";
import type { PackageName } from "@eartool/utils";
import { describe, expect, it } from "@jest/globals";
import { SymbolRenames } from "./SymbolRenames.js";
import { calculatePackageExportRenamesForFileMoves } from "./calculatePackageExportRenamesForFileMoves.js";
import { RefactorWorkspaceBuilder } from "../test-utils/RefactorWorkspaceBuilder.js";

const PACKAGE_NAME: PackageName = "mypackage";
describe(calculatePackageExportRenamesForFileMoves, () => {
  it("handles a named import module specifier ", () => {
    const { workspace, projectLoader } = new RefactorWorkspaceBuilder("/workspace")
      .createProject(PACKAGE_NAME, (p) => {
        p.addFile(
          "src/foo.ts",
          `
            export const foo = 5;
            export const notOriginallyRootExported = 6;
          `
        )
          .addFile(
            "src/baz.ts",
            `
              import {foo} from "./foo";
              export const bas = foo+1;
            `
          )
          .addFile(
            "src/index.ts",
            `
            export {foo} from "./foo";
          `
          )
          .addFile(
            "src/bar.ts",
            `
          import {notOriginallyRootExported} from "./foo";
          doStuff(notOriginallyRootExported);
        `
          );
      })
      .build();

    const project = projectLoader(workspace.getPackageByNameOrThrow(PACKAGE_NAME).packagePath)!;

    const renames = new SymbolRenames();

    const result = calculatePackageExportRenamesForFileMoves(
      project,
      new Set([`/workspace/${PACKAGE_NAME}/src/foo.ts`]),
      `/workspace/${PACKAGE_NAME}/`,
      PACKAGE_NAME,
      "baz",
      "upstream",
      renames,
      createTestLogger()
    );

    expect(result).toMatchInlineSnapshot(`
      {
        "allFilesToMove": Set {
          "/workspace/mypackage/src/foo.ts",
        },
        "requiredPackages": Set {},
        "rootExportsPerRelativeFilePath": Map {
          "src/foo.ts" => Map {
            "foo" => {
              "exportName": "foo",
              "isType": false,
            },
            "notOriginallyRootExported" => {
              "exportName": "notOriginallyRootExported",
              "isType": false,
            },
          },
        },
      }
    `);

    expect(renames.asRaw()).toMatchInlineSnapshot(`
      Map {
        "mypackage" => [
          {
            "from": [
              "foo",
            ],
            "toFileOrModule": "baz",
          },
        ],
        "/workspace/mypackage/src/foo.ts" => [
          {
            "from": [
              "notOriginallyRootExported",
            ],
            "toFileOrModule": "baz",
          },
          {
            "from": [
              "foo",
            ],
            "toFileOrModule": "baz",
          },
        ],
      }
    `);
  });

  it("drags a file with it that isn't reexported", () => {
    const { workspace, projectLoader } = new RefactorWorkspaceBuilder("/workspace")
      .createProject(PACKAGE_NAME, (p) => {
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

    const project = projectLoader(workspace.getPackageByNameOrThrow(PACKAGE_NAME).packagePath)!;

    const renames = new SymbolRenames();
    const result = calculatePackageExportRenamesForFileMoves(
      project,
      new Set([`/workspace/${PACKAGE_NAME}/src/foo.ts`]),
      `/workspace/${PACKAGE_NAME}/`,
      PACKAGE_NAME,
      "baz",
      "upstream",
      renames,
      createTestLogger()
    );

    expect(result).toMatchInlineSnapshot(`
      {
        "allFilesToMove": Set {
          "/workspace/mypackage/src/foo.ts",
          "/workspace/mypackage/src/bar.ts",
        },
        "requiredPackages": Set {},
        "rootExportsPerRelativeFilePath": Map {
          "src/foo.ts" => Map {
            "foo" => {
              "exportName": "foo",
              "isType": false,
              "originFile": "/workspace/mypackage/src/foo.ts",
            },
          },
        },
      }
    `);
    expect(renames.asRaw()).toMatchInlineSnapshot(`
      Map {
        "mypackage" => [
          {
            "from": [
              "foo",
            ],
            "toFileOrModule": "baz",
          },
        ],
      }
    `);
  });

  it("drags a file with it that is reexported", () => {
    const { workspace, projectLoader } = new RefactorWorkspaceBuilder("/workspace")
      .createProject(PACKAGE_NAME, (p) => {
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

    const project = projectLoader(workspace.getPackageByNameOrThrow(PACKAGE_NAME).packagePath)!;
    const renames = new SymbolRenames();
    const result = calculatePackageExportRenamesForFileMoves(
      project,
      new Set([`/workspace/${PACKAGE_NAME}/src/foo.ts`]),
      `/workspace/${PACKAGE_NAME}/`,
      PACKAGE_NAME,
      "baz",
      "upstream",
      renames,
      createTestLogger()
    );

    expect(result).toMatchInlineSnapshot(`
      {
        "allFilesToMove": Set {
          "/workspace/mypackage/src/foo.ts",
          "/workspace/mypackage/src/bar.ts",
        },
        "requiredPackages": Set {
          "algolib",
        },
        "rootExportsPerRelativeFilePath": Map {
          "src/foo.ts" => Map {
            "foo" => {
              "exportName": "foo",
              "isType": false,
              "originFile": "/workspace/mypackage/src/foo.ts",
            },
          },
          "src/bar.ts" => Map {
            "bar" => {
              "exportName": "baz",
              "isType": false,
              "originFile": "/workspace/mypackage/src/bar.ts",
            },
          },
        },
      }
    `);
    expect(renames.asRaw()).toMatchInlineSnapshot(`
      Map {
        "mypackage" => [
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
      }
    `);
  });
});

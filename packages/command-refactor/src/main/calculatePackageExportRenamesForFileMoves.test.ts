import type { PackageName } from "@eartool/utils";
import { describe, expect, it } from "vitest";
import { RefactorWorkspaceBuilder } from "../test-utils/RefactorWorkspaceBuilder.js";
import { calculatePackageExportRenamesForFileMoves } from "./calculatePackageExportRenamesForFileMoves.js";
import { SymbolRenames } from "./SymbolRenames.js";

const PACKAGE_NAME: PackageName = "mypackage";
describe(calculatePackageExportRenamesForFileMoves, () => {
  it("handles a named import module specifier ", () => {
    const { workspace, projectLoader, getPackageContext } = new RefactorWorkspaceBuilder(
      "/workspace",
    )
      .createProject(PACKAGE_NAME, (p) => {
        p.addFile(
          "src/foo.ts",
          `
            export const foo = 5;
            export const notOriginallyRootExported = 6;
          `,
        )
          .addFile(
            "src/baz.ts",
            `
              import {foo} from "./foo";
              export const bas = foo+1;
            `,
          )
          .addFile(
            "src/index.ts",
            `
            export {foo} from "./foo";
          `,
          )
          .addFile(
            "src/bar.ts",
            `
          import {notOriginallyRootExported} from "./foo";
          doStuff(notOriginallyRootExported);
        `,
          );
      })
      .build();

    const project = projectLoader(workspace.getPackageByNameOrThrow(PACKAGE_NAME).packagePath)!;

    const renames = new SymbolRenames();

    const result = calculatePackageExportRenamesForFileMoves(
      getPackageContext(PACKAGE_NAME),
      new Set([`/workspace/${PACKAGE_NAME}/src/foo.ts`]),
      "baz",
      "upstream",
      renames,
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
              "exportName": [
                "foo",
              ],
              "isType": false,
            },
            "notOriginallyRootExported" => {
              "exportName": [
                "notOriginallyRootExported",
              ],
              "isType": false,
            },
          },
        },
      }
    `);

    expect(renames.asRaw()).toMatchInlineSnapshot(`
      Map {
        "/workspace/mypackage/src/foo.ts" => [
          {
            "from": [
              "foo",
            ],
            "toFileOrModule": "baz",
          },
          {
            "from": [
              "notOriginallyRootExported",
            ],
            "toFileOrModule": "baz",
          },
        ],
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

  it("drags a file with it that isn't reexported", () => {
    const { getPackageContext } = new RefactorWorkspaceBuilder("/workspace")
      .createProject(PACKAGE_NAME, (p) => {
        p.addFile(
          "src/foo.ts",
          `
            import {bar} from "./bar";
            export const foo = bar;
          `,
        )
          .addFile(
            "src/bar.ts",
            `
              export const bar = 5;
            `,
          )
          .addFile(
            "src/index.ts",
            `
              export {foo} from "./foo";
            `,
          );
      })
      .build();

    const renames = new SymbolRenames();
    const result = calculatePackageExportRenamesForFileMoves(
      getPackageContext(PACKAGE_NAME),
      new Set([`/workspace/${PACKAGE_NAME}/src/foo.ts`]),
      "baz",
      "upstream",
      renames,
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
              "exportName": [
                "foo",
              ],
              "isType": false,
              "originFile": "/workspace/mypackage/src/foo.ts",
            },
          },
          "src/bar.ts" => Map {
            "bar" => {
              "exportName": [
                "bar",
              ],
              "isType": false,
              "originFile": "/workspace/mypackage/src/bar.ts",
            },
          },
        },
      }
    `);
    expect(renames.asRaw()).toMatchInlineSnapshot(`
      Map {
        "/workspace/mypackage/src/foo.ts" => [
          {
            "from": [
              "foo",
            ],
            "toFileOrModule": "baz",
          },
        ],
        "mypackage" => [
          {
            "from": [
              "foo",
            ],
            "toFileOrModule": "baz",
          },
        ],
        "/workspace/mypackage/src/bar.ts" => [
          {
            "from": [
              "bar",
            ],
            "toFileOrModule": "baz",
          },
        ],
      }
    `);
  });

  it("drags a file with it that is reexported", () => {
    const { getPackageContext } = new RefactorWorkspaceBuilder("/workspace")
      .createProject(PACKAGE_NAME, (p) => {
        p.addFile(
          "src/foo.ts",
          `
          import {bar} from "./bar";
          import {runAlgo} from "algolib";
          export const foo = runAlgo(bar);
        `,
        )
          .addFile(
            "src/bar.ts",
            `
          export const bar = 5;
        `,
          )
          .addFile(
            "src/index.ts",
            `
          export {foo} from "./foo";
          export {bar as baz} from "./bar";
        `,
          );
      })
      .build();

    const renames = new SymbolRenames();
    const result = calculatePackageExportRenamesForFileMoves(
      getPackageContext(PACKAGE_NAME),
      new Set([`/workspace/${PACKAGE_NAME}/src/foo.ts`]),
      "baz",
      "upstream",
      renames,
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
              "exportName": [
                "foo",
              ],
              "isType": false,
              "originFile": "/workspace/mypackage/src/foo.ts",
            },
          },
          "src/bar.ts" => Map {
            "bar" => {
              "exportName": [
                "baz",
              ],
              "isType": false,
              "originFile": "/workspace/mypackage/src/bar.ts",
            },
          },
        },
      }
    `);
    expect(renames.asRaw()).toMatchInlineSnapshot(`
      Map {
        "/workspace/mypackage/src/foo.ts" => [
          {
            "from": [
              "foo",
            ],
            "toFileOrModule": "baz",
          },
        ],
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
        "/workspace/mypackage/src/bar.ts" => [
          {
            "from": [
              "bar",
            ],
            "toFileOrModule": "baz",
          },
        ],
      }
    `);
  });

  it("handles two reexports", () => {
    const { getPackageContext } = new RefactorWorkspaceBuilder("/workspace")
      .createProject(PACKAGE_NAME, (p) => {
        p.addFile(
          "src/foo.ts",
          `
          export const foo = 5;
          export {bar} from "./bar";
        `,
        )
          .addFile(
            "src/bar.ts",
            `
          export const bar = 5;
        `,
          )
          .addFile(
            "src/index.ts",
            `
          export {foo} from "./foo";
          export {bar as baz} from "./bar";
        `,
          );
      })
      .build();

    const renames = new SymbolRenames();
    const result = calculatePackageExportRenamesForFileMoves(
      getPackageContext(PACKAGE_NAME),
      new Set([`/workspace/${PACKAGE_NAME}/src/foo.ts`]),
      "baz",
      "upstream",
      renames,
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
              "exportName": [
                "foo",
              ],
              "isType": false,
              "originFile": "/workspace/mypackage/src/foo.ts",
            },
            "bar" => {
              "exportName": [
                "bar",
              ],
              "isType": false,
              "originFile": "/workspace/mypackage/src/bar.ts",
            },
          },
          "src/bar.ts" => Map {
            "bar" => {
              "exportName": [
                "baz",
              ],
              "isType": false,
              "originFile": "/workspace/mypackage/src/bar.ts",
            },
          },
        },
      }
    `);
    expect(renames.asRaw()).toMatchInlineSnapshot(`
      Map {
        "/workspace/mypackage/src/foo.ts" => [
          {
            "from": [
              "foo",
            ],
            "toFileOrModule": "baz",
          },
        ],
        "/workspace/mypackage/src/bar.ts" => [
          {
            "from": [
              "bar",
            ],
            "toFileOrModule": "baz",
          },
        ],
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

  it("handles two dragging reexports", () => {
    const { getPackageContext } = new RefactorWorkspaceBuilder("/workspace")
      .createProject(PACKAGE_NAME, (p) => {
        p.addFile(
          "src/foo.ts",
          `
          export const foo = 5;
          import {bar} from "./bar";
        `,
        )
          .addFile(
            "src/bar.ts",
            `
            export {bar2 as  bar} from "./bar2";
            export {unrelated} from "./unrelated";
        `,
          )
          .addFile("src/bar2.ts", `export const bar2 = 5;`)
          .addFile("src/unrelated.ts", `export const unrelated = 5;`)
          .addFile(
            "src/index.ts",
            `
          export {foo} from "./foo";
          export {bar as baz} from "./bar";
        `,
          );
      })
      .build();

    const renames = new SymbolRenames();
    const result = calculatePackageExportRenamesForFileMoves(
      getPackageContext(PACKAGE_NAME),
      new Set([`/workspace/${PACKAGE_NAME}/src/foo.ts`]),
      "baz",
      "upstream",
      renames,
    );

    expect(result).toMatchInlineSnapshot(`
      {
        "allFilesToMove": Set {
          "/workspace/mypackage/src/foo.ts",
          "/workspace/mypackage/src/bar2.ts",
        },
        "requiredPackages": Set {},
        "rootExportsPerRelativeFilePath": Map {
          "src/foo.ts" => Map {
            "foo" => {
              "exportName": [
                "foo",
              ],
              "isType": false,
              "originFile": "/workspace/mypackage/src/foo.ts",
            },
          },
          "src/bar2.ts" => Map {
            "bar2" => {
              "exportName": [
                "bar2",
              ],
              "isType": false,
              "originFile": "/workspace/mypackage/src/bar2.ts",
            },
          },
        },
      }
    `);
    expect(renames.asRaw()).toMatchInlineSnapshot(`
      Map {
        "/workspace/mypackage/src/foo.ts" => [
          {
            "from": [
              "foo",
            ],
            "toFileOrModule": "baz",
          },
        ],
        "mypackage" => [
          {
            "from": [
              "foo",
            ],
            "toFileOrModule": "baz",
          },
        ],
        "/workspace/mypackage/src/bar2.ts" => [
          {
            "from": [
              "bar2",
            ],
            "toFileOrModule": "baz",
          },
        ],
      }
    `);
  });
});

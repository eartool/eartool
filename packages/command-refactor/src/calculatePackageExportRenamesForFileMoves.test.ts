import { describe, expect, it } from "@jest/globals";
import { calculatePackageExportRenamesForFileMoves } from "./calculatePackageExportRenamesForFileMoves.js";
import { WorkspaceBuilder } from "./WorkspaceBuilder.js";

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
      "downstream"
    );

    const expected: ReturnType<typeof calculatePackageExportRenamesForFileMoves> = {
      packageExportRenames: [{ from: ["foo"], toFileOrModule: "baz" }],
      allFilesToMove: new Set(["/workspace/foo/src/foo.ts"]),
      requiredPackages: new Map(),
    };

    expect(result).toEqual(expected);
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
      "downstream"
    );

    const expected: ReturnType<typeof calculatePackageExportRenamesForFileMoves> = {
      packageExportRenames: [{ from: ["foo"], toFileOrModule: "baz" }],
      allFilesToMove: new Set(["/workspace/foo/src/foo.ts", "/workspace/foo/src/bar.ts"]),
      requiredPackages: new Map(),
    };

    expect(result).toEqual(expected);
  });

  it("drags a file with it that is reexported", () => {
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
          export {bar} from "./bar";
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
      "downstream"
    );

    const expected: ReturnType<typeof calculatePackageExportRenamesForFileMoves> = {
      packageExportRenames: [
        { from: ["foo"], toFileOrModule: "baz" },
        { from: ["bar"], toFileOrModule: "baz" },
      ],
      allFilesToMove: new Set(["/workspace/foo/src/foo.ts", "/workspace/foo/src/bar.ts"]),
      requiredPackages: new Map(),
    };

    expect(result).toEqual(expected);
  });
});

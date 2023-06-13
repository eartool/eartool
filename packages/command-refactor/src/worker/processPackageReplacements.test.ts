import { createTestLogger, formatTestTypescript } from "@eartool/test-utils";
import type { FilePath, PackageName } from "@eartool/utils";
import { describe, expect, it } from "@jest/globals";
import { getJobArgs } from "../main/getJobArgs.js";
import { setupOverall } from "../main/setupOverall.js";
import { createInitialWorkspaceBuilder } from "../test-utils/createInitialWorkspaceBuilder.js";
import { processPackageReplacements } from "./processPackageReplacements.js";
import type { Logger } from "pino";
import * as path from "node:path";
import type { WorkerPackageContext } from "./WorkerPackageContext.js";
import type { SourceFile } from "ts-morph";
import workerMain from "./workerMain.js";

describe(processPackageReplacements, () => {
  describe("doThingWithState -> state", () => {
    const destination = "state";
    const filesToMove = new Set(["/workspace/api/src/doThingWithState.ts"]);

    it("handles api project properly", async () => {
      const result = await standardSetup(filesToMove, destination);

      const { filesChanged, helpers } = await standardProcessPackageReplacmements(result, "api");

      expect(helpers.getTestResultsForFiles(filesChanged)).toMatchInlineSnapshot(`
        "// ==========================================================
        // <>: /workspace/api/src/index.ts
        //

        export { doThingWithBaz } from "./doThingWithBaz";

        export { selectA } from "./selectA";
        export { Baz } from "./Baz";

        //
        // </>: /workspace/api/src/index.ts
        // ==========================================================

        // ==========================================================
        // <>: /workspace/api/src/selectA.ts
        //

        import { doThingWithState } from "state";
        import {} from "./doThingWithState";

        export function selectA(state: State) {
          return doThingWithState(state);
        }

        //
        // </>: /workspace/api/src/selectA.ts
        // ==========================================================

        // ==========================================================
        // <>: /workspace/api/src/doThingWithState.ts
        //

        // FILE DOES NOT EXIST

        //
        // </>: /workspace/api/src/doThingWithState.ts
        // ==========================================================
        "
      `);
    });

    it("handles state project properly", async () => {
      const result = await standardSetup(filesToMove, destination);

      const { filesChanged, helpers } = await standardProcessPackageReplacmements(result, "state");

      expect(helpers.getTestResultsForFiles(filesChanged)).toMatchInlineSnapshot(`
        "// ==========================================================
        // <>: /workspace/state/src/doThingWithState.ts
        //

        import { identity } from "util";
        import { State } from "./state";

        export function doThingWithState(state: State) {
          return identity(state.foo);
        }

        //
        // </>: /workspace/state/src/doThingWithState.ts
        // ==========================================================

        // ==========================================================
        // <>: /workspace/state/src/index.ts
        //

        export { State } from "./state";
        export { doThingWithState } from "./doThingWithState";

        //
        // </>: /workspace/state/src/index.ts
        // ==========================================================
        "
      `);
    });

    it("handles app project properly", async () => {
      const result = await standardSetup(filesToMove, destination);

      const { filesChanged, helpers } = await standardProcessPackageReplacmements(result, "app");

      expect(helpers.getTestResultsForFiles(filesChanged)).toMatchInlineSnapshot(`
        "// ==========================================================
        // <>: /workspace/app/src/cli.ts
        //

        import { doThingWithState } from "state";
        import {} from "api";
        import { State } from "state";

        print(doThingWithState({ foo: 5 }));

        //
        // </>: /workspace/app/src/cli.ts
        // ==========================================================
        "
      `);
    });
  });
});

async function standardProcessPackageReplacmements(
  result: StandardSetupResult,
  packageName: string
) {
  const ctx = result.getWorkerPackageContext(packageName);

  const jobArgs = getJobArgs(packageName, result, result.setupResults);

  const filesChanged = await processPackageReplacements(
    ctx,
    jobArgs.filesToRemove,
    jobArgs.relativeFileInfoMap,
    result.setupResults.packageExportRenamesMap,
    false
  );

  return {
    filesChanged,
    ctx,
    helpers: createCtxHelperFunctions(ctx),
  };
}

type StandardSetupResult = ReturnType<ReturnType<typeof createInitialWorkspaceBuilder>["build"]> & {
  logger: Logger;
  setupResults: Awaited<ReturnType<typeof setupOverall>>;
  destination: PackageName;
  helpersForPackage: (packageName: string) => PackageRelativeHelpers;
};

interface PackageRelativeHelpers {
  getSourceFile: (filePath: string) => SourceFile | undefined;
  getSourceFileOrThrow: (filePath: string) => SourceFile;
  getFormattedFileContents: (filePath: string) => string;
  getTestResultsForFiles: (files: string[]) => string;
}

function createCtxHelperFunctions(ctx: WorkerPackageContext): PackageRelativeHelpers {
  const getSourceFile = (filePath: string) => {
    return ctx.project.getSourceFile(path.resolve(ctx.packagePath, filePath));
  };

  const getSourceFileOrThrow = (filePath: string) => {
    return ctx.project.getSourceFileOrThrow(path.resolve(ctx.packagePath, filePath));
  };

  const getFormattedFileContents = (filePath: string) => {
    return formatTestTypescript(getSourceFileOrThrow(filePath).getFullText());
  };

  const getTestResultsForFiles = (files: string[]) => {
    return formatTestTypescript(
      files
        .map(
          (filePath) => `// ==========================================================
    // <>: ${filePath}
    //
    
    ${getSourceFile(filePath)?.getFullText() ?? "// FILE DOES NOT EXIST"}

    // 
    // </>: ${filePath}
    // ==========================================================
    `
        )
        .join("\n")
    );
  };

  return {
    getSourceFile,
    getSourceFileOrThrow,
    getFormattedFileContents,
    getTestResultsForFiles,
  };
}

async function standardSetup(
  filesToMove: Set<FilePath>,
  destination: PackageName
): Promise<StandardSetupResult> {
  const builtResults = createInitialWorkspaceBuilder().build();
  const logger = createTestLogger();
  const setupResults = await setupOverall(
    builtResults.workspace,
    builtResults.projectLoader,
    filesToMove,
    destination,
    logger
  );

  const helpersForPackage = (packageName: string) =>
    createCtxHelperFunctions(builtResults.getWorkerPackageContext(packageName));

  return { ...builtResults, logger, setupResults, destination, helpersForPackage };
}

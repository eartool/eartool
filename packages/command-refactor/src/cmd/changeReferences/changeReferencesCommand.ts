import { makeBatchCommand } from "@eartool/batch";
import type * as yargs from "yargs";
import type { ChangeReferencesJobArgs } from "./changeReferencesWorker.js";
import { createPackageExportRenames } from "./createPackageExportRenames.js";

const changeReferencesOptions = {
  rename: {
    string: true,
    demandOption: true,
  },
} satisfies { [key: string]: yargs.Options };

export const changeReferencesCommand = makeBatchCommand(
  {
    name: "rename-references",
    description: "updates references from one package/name to another",

    // example: [
    //   "$0 move-files -f /full/path.ts -d @myorg/mypackage",
    //   "Moves /full/path.ts and all its requirements to @myorg/mypackage",
    // ],
    options: changeReferencesOptions,
    cliMain: async (args) => {
      const jobArgs: ChangeReferencesJobArgs = {
        renames: createPackageExportRenames(args.rename),
      };

      // Delete old files and create new ones before running the job
      return {
        workerUrl: new URL(import.meta.url), // FIXME get this as an arg to makeBatchCommand so this func can move
        getJobArgs(): ChangeReferencesJobArgs {
          return jobArgs;
        },
        onComplete() {
          //
        },
        order: "any",
      };
    },
  },
  () => import("./changeReferencesWorker.js")
);

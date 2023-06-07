import { makeBatchCommand } from "@eartool/batch";
import type * as yargs from "yargs";
import { createStore } from "./createStore.js";
import { selectAdditionalRenames, workCompleted } from "./workResults.js";

const options = {
  namespaces: {
    type: "boolean",
    default: true,
  },
  "faux-namespaces": {
    type: "boolean",
    default: true,
  },

  "organize-imports": {
    describe: "Whether or not to organise imports",
    type: "boolean",
    default: true,
  },
} as const satisfies { [key: string]: yargs.Options };

export default makeBatchCommand(
  {
    name: "fix-namespaces",
    description: "Removes real and faux namespaces from the codebase",
    options,
    cliMain: async ({
      fauxNamespaces: removeFauxNamespaces,
      namespaces: removeNamespaces,
      organizeImports,
      downstream: fixDownstream,
    }) => {
      const { store } = createStore();

      return {
        workerUrl: new URL(import.meta.url),
        getJobArgs: ({ isInStartGroup }) => {
          return {
            removeNamespaces: removeNamespaces && isInStartGroup,
            removeFauxNamespaces: removeFauxNamespaces && isInStartGroup,
            organizeImports: organizeImports,
            fixDownstream: fixDownstream,
            additionalRenames: fixDownstream
              ? selectAdditionalRenames(store.getState())
              : new Map(),
          };
        },
        onComplete: ({ packageName }, { result: exportedRenames }) => {
          store.dispatch(workCompleted({ exportedRenames, packageName }));
        },
      };
    },
  },
  () => import("../worker/workerMain.js")
);

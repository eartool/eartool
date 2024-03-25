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
  from: {
    describe: "",
    array: true,
    string: true,
    default: [] as string[],
    defaultDescription: "All packages",
  },
  downstream: {
    type: "boolean",
    default: true,
  },
} as const satisfies { [key: string]: yargs.Options };

export default makeBatchCommand(
  {
    name: "fix-namespaces",
    description: false, // "Removes real and faux namespaces from the codebase",
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
        onComplete: ({ packageName }, { result: exportedRenames, logger }) => {
          logger.debug("Got exported renames %o", exportedRenames);
          store.dispatch(workCompleted({ exportedRenames, packageName }));
        },
        order: "upstreamFirst",
      };
    },
  },
  () => import("../worker/workerMain.js"),
);

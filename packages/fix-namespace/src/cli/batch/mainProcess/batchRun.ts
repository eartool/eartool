import type * as yargs from "yargs";
import { MultiBar, Presets } from "cli-progress";
import { createWorkspaceInfo } from "../WorkspaceInfo.js";
import { MessagesToMain } from "../shared/messages/index.js";
import { nanoid, isAllOf, isAnyOf, type ListenerEffectAPI } from "@reduxjs/toolkit";
import { startWorker } from "./workerIdReducer.js";
import { createStore } from "./createStore.js";
import { createHasSenderId } from "../shared/messages/withSenderId.js";
import { selectAdditionalRenames } from "./workResults.js";
import * as path from "node:path";
import { forkWorker } from "./forkWorker.js";
import { createLogger } from "../worker/createLogger.js";
import type { Logger } from "pino";

export default function registerCommand(yargs: yargs.Argv<NonNullable<unknown>>) {
  return yargs.command(
    "foo",
    "describe",
    (yargs) => {
      return yargs
        .options({
          workspace: {
            alias: ["w", "workspaceDir"],
            type: "string",
            describe: "The workspace to run against",
            demandOption: true,
          },
          startPackageNames: {
            describe: "",
            array: true,
            type: "string",
            default: [] as string[],
          },
          removeNamespaces: {
            type: "boolean",
            default: true,
          },
          removeFauxNamespaces: {
            type: "boolean",
            default: true,
          },
          fixDownstream: {
            type: "boolean",
            default: true,
          },
          organizeImports: {
            describe: "Whether or not to organise imports",
            type: "boolean",
            default: true,
          },
          dryRun: {
            describe: "Whether to run without saving changes",
            type: "boolean",
            default: false,
          },
        } as const satisfies { [key: string]: yargs.Options })
        .strict();
    },
    async ({
      workspace,
      startPackageNames,
      dryRun,
      removeNamespaces,
      removeFauxNamespaces,
      fixDownstream,
      organizeImports,
    }) => {
      await batchRun(workspace, {
        startProjects: startPackageNames,
        dryRun,
        organizeImports,
        removeFauxNamespaces,
        removeNamespaces,
        fixDownstream,
        logDir: "", // FIXME
      });
    }
  );
}

export interface BatchRunOptions {
  startProjects: string[]; // todo support glob?
  removeNamespaces: boolean;
  removeFauxNamespaces: boolean;
  organizeImports: boolean;
  fixDownstream: boolean;
  dryRun: boolean;
  logDir: string;
}

export async function batchRun(
  workspaceDir: string,
  // startProjectName: string | undefined,
  opts: BatchRunOptions
) {
  // we have at least 11 under a normal run on my mac. it doesn't grow, we arent leaking
  process.setMaxListeners(20);

  // TODO If we arent fixing downstream we can short circuit this a lot

  const logger = createLogger(path.join(workspaceDir, ".log"), "main", "trace");

  logger.trace("Creating workspace object");
  const workspace = await createWorkspaceInfo(workspaceDir);
  const startNodeLookups = opts.startProjects.map((name) => ({ name }));
  const downStreamProjects = [...workspace.walkTreeDownstreamFrom(...startNodeLookups)];

  const {
    listenerMiddleware,
    store: { dispatch, getState },
  } = createStore();

  const multibar = new MultiBar(
    { format: " {bar} | {name} | {percentage}% {stage} | {eta_formatted}", fps: 2 },
    Presets.rect
  );
  const topBar = multibar.create(downStreamProjects.length, 0, {
    name: "total package progress",
    stage: "",
  });

  listenerMiddleware.startListening({
    actionCreator: startWorker,
    effect: createStartWorkerEffect(multibar, logger),
  });

  await workspace.runTasksInOrder(startNodeLookups, async ({ packageName, packagePath }) => {
    return new Promise<void>((resolve) => {
      const isInStartGroup =
        startNodeLookups.length === 0 || startNodeLookups.some((a) => a.name === packageName);
      dispatch(
        startWorker({
          removeNamespaces: opts.removeNamespaces && isInStartGroup,
          removeFauxNamespaces: opts.removeFauxNamespaces && isInStartGroup,
          dryRun: opts.dryRun,
          organizeImports: opts.organizeImports,

          senderId: nanoid(),
          packageName,
          packagePath,
          logDir: path.join(workspaceDir, ".log"),
          onComplete: () => {
            topBar.increment();
            resolve();
          },
          additionalRenames: opts.fixDownstream ? selectAdditionalRenames(getState()) : new Map(),
        })
      );
    });
  });

  multibar.stop();
}

function createStartWorkerEffect(multibar: MultiBar, logger: Logger) {
  return async function startWorkerEffect(
    { payload: { onComplete, ...workerData } }: ReturnType<typeof startWorker>,
    api: ListenerEffectAPI<unknown, any, unknown>
  ) {
    logger.trace("Forking worker for %s", workerData.packagePath);
    const _myPort = forkWorker(workerData, api.dispatch);
    const hasSenderId = createHasSenderId(workerData.senderId);

    const bar = multibar.create(100, 0, {
      name: workerData.packageName,
      stage: "initializing",
    });

    while (!api.signal.aborted) {
      const [result] = await api.take(
        isAnyOf(
          isAllOf(MessagesToMain.updateStatus.match, hasSenderId),
          isAllOf(MessagesToMain.workComplete.match, hasSenderId)
        )
      );

      if (MessagesToMain.workComplete.match(result)) {
        logger.debug("Recieved workComplete form worker %s", workerData.packagePath);
        multibar.remove(bar);
        onComplete();
        return;
      } else {
        bar.setTotal(result.payload.totalWorkUnits);
        bar.update(result.payload.completedWorkUnits, { stage: result.payload.stage });
      }
    }
  };
}

import type * as yargs from "yargs";
import { MultiBar, Presets, type SingleBar } from "cli-progress";
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

export default function registerCommand(_yargs: yargs.Argv<NonNullable<unknown>>) {
  // yargs.command()
}

export async function batchRun(workspaceDir: string, startProjectName: string | undefined) {
  // we have at least 11 under a normal run on my mac. it doesn't grow, we arent leaking
  process.setMaxListeners(20);

  const start = startProjectName ? { name: startProjectName } : undefined;

  const logger = createLogger(path.join(workspaceDir, ".log"), "main", "trace");

  logger.trace("Creating workspace object");
  const workspace = await createWorkspaceInfo(workspaceDir);
  const downStreamProjects = [...workspace.walkTreeDownstreamFromName(start)];

  const {
    listenerMiddleware,
    store: { dispatch, getState },
  } = createStore();

  const multibar = new MultiBar(
    { format: " {bar} | {name} | {percentage}% {stage} {eta}", fps: 2 },
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

  await workspace.runTasksInOrder(start, async ({ packageName, packagePath }) => {
    return new Promise<void>((resolve) => {
      dispatch(
        startWorker({
          removeNamespaces: start ? start?.name === packageName : true,
          senderId: nanoid(),
          packageName,
          packagePath,
          logDir: path.join(workspaceDir, ".log"),
          onComplete: () => {
            topBar.increment();
            resolve();
          },
          additionalRenames: selectAdditionalRenames(getState()),
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

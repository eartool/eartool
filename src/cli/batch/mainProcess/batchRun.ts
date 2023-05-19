import * as yargs from "yargs";
import { MultiBar, Presets, SingleBar } from "cli-progress";
import { createWorkspaceInfo } from "../WorkspaceInfo.js";
import { Worker, MessageChannel } from "node:worker_threads";
import { MessagesToMain } from "../shared/messages/index.js";
import { nanoid, type ListenerMiddlewareInstance, type Dispatch, isAllOf } from "@reduxjs/toolkit";
import { startWorker } from "./workerIdReducer.js";
import { createStore } from "./createStore.js";
import type { WorkerData } from "../shared/messages/WorkerData.js";
import { createHasSenderId } from "../shared/messages/withSenderId.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function registerCommand(yargs: yargs.Argv<NonNullable<unknown>>) {
  // yargs.command()
}

export async function batchRun(workspaceDir: string, startProjectName: string | undefined) {
  const workspaceInfo = await createWorkspaceInfo(workspaceDir);
  const downStreamProjects = workspaceInfo.getDownStreamProjectsFromName(startProjectName);

  const {
    listenerMiddleware,
    store: { dispatch },
  } = createStore();

  const multibar = new MultiBar(
    { format: " {bar} | {name} | {value}/{total}", fps: 2 },
    Presets.rect
  );
  const topBar = multibar.create(downStreamProjects.length, 0, { name: "total" });

  registerListeners(listenerMiddleware, multibar, topBar);

  await workspaceInfo.runTasksInOrder(startProjectName, async ({ packageName, packagePath }) => {
    return new Promise<void>((resolve) => {
      dispatch(startWorker({ senderId: nanoid(), packageName, packagePath, onComplete: resolve }));
    });

    // topBar.increment();
  });

  multibar.stop();
}

function registerListeners(
  listenerMiddleware: ListenerMiddlewareInstance,
  multibar: MultiBar,
  topBar: SingleBar
) {
  listenerMiddleware.startListening({
    actionCreator: startWorker,
    effect: ({ payload: { onComplete, ...workerData } }, api) => {
      const myPort = forkWorker(workerData, api.dispatch);
      const hasSenderId = createHasSenderId(workerData.senderId);

      const bar = multibar.create(100, 0, {
        name: workerData.packageName,
      });

      api.fork(
        async (_forkApi) => {
          const [{ payload }] = await api.take(
            isAllOf(MessagesToMain.UpdateStatus.match, hasSenderId)
          );
          bar.setTotal(payload.totalFiles);
          bar.update(payload.filesComplete);

          if (payload.stage === "complete") {
            multibar.remove(bar);
            topBar.increment();
            onComplete();
          }
        },
        { autoJoin: true }
      );
    },
  });
}

function forkWorker(action: WorkerData, dispatch: Dispatch) {
  const worker = new Worker(new URL("../worker/batchWorker.js", import.meta.url), {
    workerData: {
      ...action,
    },
  });
  const { port1: myPort, port2: theirPort } = new MessageChannel();

  myPort.addListener("message", (message) => {
    dispatch(message);
  });

  worker.postMessage({ port: theirPort }, [theirPort]);

  return myPort;
}

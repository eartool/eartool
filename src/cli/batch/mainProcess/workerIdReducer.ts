import { createSlice, type PayloadAction, type Reducer, type Slice } from "@reduxjs/toolkit";
import type { SenderId } from "../shared/messages/withSenderId.js";
import type { WorkerData } from "../shared/messages/WorkerData.js";

interface SliceState {
  senderIdToPackagePath: Record<SenderId, string>;
  packagePathToSenderId: Record<string, SenderId>;
}

export const initialState: SliceState = {
  senderIdToPackagePath: {},
  packagePathToSenderId: {},
};

const slice = createSlice({
  name: "workerIdState",
  initialState,
  reducers: {
    startWorker: (
      state,
      { payload: { senderId, packagePath } }: PayloadAction<WorkerData & { onComplete: () => void }>
    ) => {
      state.senderIdToPackagePath[senderId] = packagePath;
      state.packagePathToSenderId[packagePath] = senderId;
    },
  },
});

export const selectPackagePathFromSenderId = (state: SliceState, senderId: SenderId) => {
  return state.senderIdToPackagePath[senderId];
};

export const { startWorker } = slice.actions;

// it needs to be declared for the reducer export
export default slice.reducer as Reducer<SliceState>;

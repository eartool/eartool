import { createSlice, type PayloadAction, type Reducer } from "@reduxjs/toolkit";
import { type SenderId } from "../shared/messages/withSenderId.js";
import { type WorkerData } from "../shared/messages/WorkerData.js";

interface SliceState {
  senderIdToPackagePath: Record<SenderId, string>;
  packagePathToSenderId: Record<string, SenderId>;
}

const initialState: SliceState = {
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

const { actions, reducer } = slice;

export const { startWorker } = actions;
export default reducer;

import type { EntityState, Reducer } from "@reduxjs/toolkit";
import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import type { PackageExportRename } from "@eartool/replacements";
import * as MessagesToMain from "../shared/messages/MessagesToMain.js";

interface JobResult {
  packageName: string;
  exportedRenames: PackageExportRename[];
}

const adapter = createEntityAdapter<JobResult>({
  selectId: (a) => a.packageName,
});

const slice = createSlice({
  name: "workResults",
  initialState: adapter.getInitialState(),
  reducers: {
    junk: (state) => {
      return state;
    },
  },
  extraReducers: (a) => {
    a.addCase(MessagesToMain.workComplete, (state, aa) => {
      adapter.addOne(state, aa.payload);
    });
  },
  selectors: {
    selectAdditionalRenames: (state) => {
      const ret = new Map<string, PackageExportRename[]>();
      for (const q of state.ids) {
        ret.set(q as string, state.entities[q]!.exportedRenames);
      }
      return ret;
    },
  },
});

export const { selectAdditionalRenames } = slice.selectors;

// it needs to be declared for the reducer export
export default slice.reducer as Reducer<EntityState<JobResult>>;
export const initialState = slice.getInitialState();

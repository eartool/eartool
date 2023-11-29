import type { EntityState, Reducer } from "@reduxjs/toolkit";
import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import type { PackageExportRename } from "@eartool/replacements";

interface JobResult {
  packageName: string;
  exportedRenames: PackageExportRename[];
}

const adapter = createEntityAdapter<JobResult, string>({
  selectId: (a) => a.packageName,
});

const slice = createSlice({
  name: "workResults",
  initialState: adapter.getInitialState(),
  reducers: {
    workCompleted: adapter.addOne,
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
import "reselect";
export const { selectAdditionalRenames } = slice.selectors;
export const { workCompleted } = slice.actions;

// it needs to be declared for the reducer export
export default slice.reducer as Reducer<EntityState<JobResult, string>>;
export const initialState = slice.getInitialState();

import { createAction } from "@reduxjs/toolkit";

export interface Status {
  totalWorkUnits: number;
  completedWorkUnits: number;
  stage: string;
}

export const updateStatus = createAction<Status>("ToMain-UpdateStatus");

export const workComplete = createAction<unknown>("ToMain-WorkComplete");

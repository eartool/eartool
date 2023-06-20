import { createAction } from "@reduxjs/toolkit";

export interface Status {
  totalWorkUnits: number;
  completedWorkUnits: number;
  stage: string;
}

export const updateStatus = createAction<Status>("ToMain-UpdateStatus");

export const workComplete = createAction<
  { status: "success"; result: unknown } | { status: "failed"; error: unknown }
>("ToMain-WorkComplete");

interface LogMessageShape extends Record<string, unknown> {
  level: number;
  time: number;
  pid: number;
  hostname: string;
  msg?: string;
}

export const log = createAction<LogMessageShape>("ToMain-log");

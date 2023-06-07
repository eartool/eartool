import { createAction } from "@reduxjs/toolkit";
import type { Level } from "pino";

export interface Status {
  totalWorkUnits: number;
  completedWorkUnits: number;
  stage: string;
}

export const updateStatus = createAction<Status>("ToMain-UpdateStatus");

export const workComplete = createAction<unknown>("ToMain-WorkComplete");

interface LogMessageShape extends Record<string, unknown> {
  level: number;
  time: number;
  pid: number;
  hostname: string;
  msg?: string;
}

export const log = createAction<LogMessageShape>("ToMain-log");
import { type Message } from "./Message.js";
import { withSenderId } from "./withSenderId.js";
import { createAction } from "@reduxjs/toolkit";

export const ReadyMessage = createAction("ToMain-Ready", withSenderId<{ foo: string }>());
export const UpdateStatus = createAction(
  "ToMain-UpdateStatus",
  withSenderId<{
    totalFiles: number;
    filesComplete: number;
    stage: "analyzing" | "writing" | "organizing" | "complete";
  }>()
);

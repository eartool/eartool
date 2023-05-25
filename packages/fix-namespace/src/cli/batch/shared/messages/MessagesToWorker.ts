import { createAction } from "@reduxjs/toolkit";
import { withSenderId } from "./withSenderId.js";
// import { type Message } from "./Message.js";

// export interface StartProcessPackage extends Message<"StartProcessPackage"> {
//   packagePath: string;
// }

// export type All = StartProcessPackage;
export const StartProcessPackage = createAction(
  "StartProcessPackage",
  withSenderId<{
    packagePath: string;
  }>()
);

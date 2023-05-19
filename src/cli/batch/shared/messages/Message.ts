import { createAction } from "@reduxjs/toolkit";
import { withSenderId } from "./withSenderId.js";

export interface Message<T extends string> {
  type: T;
}

const q = createAction("foo", withSenderId<{ foo: "bar" }>());

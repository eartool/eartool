import { isMainThread, workerData } from "node:worker_threads";
import type { Flavored } from "../../../../utils/Flavored.js";

export type SenderId = Flavored<string, "SenderId">;
export const senderId: SenderId = isMainThread ? "main" : workerData.senderId;

export interface WithSenderId {
  senderId: SenderId;
}

export function createHasSenderId(senderId: SenderId) {
  return function hasSenderId(action: any): action is { meta: WithSenderId } {
    return action.meta?.senderId == senderId;
  };
}

export function withSenderId<T>() {
  return (payload: T) => {
    return {
      payload,
      meta: {
        senderId,
      },
    };
  };
}

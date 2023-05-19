import { type SenderId } from "./withSenderId.js";

export interface WorkerData {
  senderId: SenderId;
  packageName: string;
  packagePath: string;
}

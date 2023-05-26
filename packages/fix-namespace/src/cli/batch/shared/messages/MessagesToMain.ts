import type { Status } from "../../../../processProject.js";
import type { PackageExportRename } from "@eartool/replacements";
import { withSenderId } from "./withSenderId.js";
import { createAction } from "@reduxjs/toolkit";

export const ready = createAction("ToMain-Ready", withSenderId<{ foo: string }>());

export const updateStatus = createAction("ToMain-UpdateStatus", withSenderId<Status>());

export const workComplete = createAction(
  "ToMain-WorkComplete",
  withSenderId<{ packageName: string; exportedRenames: PackageExportRename[] }>()
);

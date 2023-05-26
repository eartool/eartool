#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import registerCommand from "./cli/batch/mainProcess/batchRun.js";

export default async function cli() {
  return await registerCommand(yargs(hideBin(process.argv)))
    .strict()
    .showHelpOnFail(true)
    .parseAsync();
}

#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { registerFixNamespaceCommand } from "@eartool/fix-namespace";

export default async function cli() {
  return await registerFixNamespaceCommand(yargs(hideBin(process.argv)))
    .strict()
    .demandCommand()
    .showHelpOnFail(true)
    .parseAsync();
}

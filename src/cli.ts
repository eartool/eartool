#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { processPackage } from "./processPackage.js";

const argv = await yargs(hideBin(process.argv))
  .options({
    package: { type: "string", demandOption: false, defaultDescription: "cwd" },
    changesDir: { type: "string" },
    dryRun: { type: "boolean", default: "false" },
  })
  .strict()
  .showHelpOnFail(true).argv;

processPackage(argv.package ?? process.cwd());

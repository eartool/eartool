#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { processPackage } from "./processPackage.js";
import { pino } from "pino";
import pinoPretty from "pino-pretty";

const argv = await yargs(hideBin(process.argv))
  .options({
    package: {
      type: "string",
      demandOption: false,
      defaultDescription: "cwd",
      default: process.cwd(),
    },
    changesDir: { type: "string" },
    dryRun: { type: "boolean", default: false },
    logLevel: {
      type: "string",
      choices: ["fatal", "error", "warn", "info", "debug", "trace", "silent"],
      default: "info",
    },
  })
  .strict()
  .showHelpOnFail(true).argv;

process.chdir(argv.package);

const logger = pino(
  {
    level: argv.logLevel,
  },
  pinoPretty.default({
    colorize: true,
    sync: true,
  })
);

try {
  processPackage(process.cwd(), { logger, dryRun: argv.dryRun });
} finally {
  logger.flush();
}

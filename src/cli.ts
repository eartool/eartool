#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { processPackage } from "./processPackage.js";
import { createConsoleLogger } from "./utils/createConsoleLogger.js";
import { batchRun } from "./cli/batch/mainProcess/batchRun.js";

export default async function cli() {
  return await yargs(hideBin(process.argv))
    .command(
      "foo",
      "describe",
      (yargs) => {
        return yargs.options({
          workspaceDir: {
            type: "string",
            demandOption: true,
          },
          startPackageName: {
            type: "string",
          },
        });
      },
      async (argv) => {
        await batchRun(argv.workspaceDir, argv.startPackageName);
      }
    )
    .command(
      "singlePackageRun",
      "run against a single package no extras",
      (yargs) => {
        return yargs.options({
          packagePath: {
            type: "string",
            demandOption: false,
            defaultDescription: "cwd",
            default: process.cwd(),
            alias: "package",
          },
          changesDir: { type: "string" },
          dryRun: { type: "boolean", default: false },
          logLevel: {
            choices: ["fatal", "error", "warn", "info", "debug", "trace", "silent"],
            default: "info",
          },
        } as const);
      },
      ({ packagePath, logLevel, dryRun }) => {
        process.chdir(packagePath);

        const logger = createConsoleLogger(logLevel);

        try {
          processPackage(process.cwd(), { logger, dryRun });
        } finally {
          logger.flush();
        }
      }
    )
    .strict()
    .showHelpOnFail(true)
    .parseAsync();
}

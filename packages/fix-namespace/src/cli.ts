#!/usr/bin/env node

import yargs, { type Options } from "yargs";
import { hideBin } from "yargs/helpers";
import { batchRun } from "./cli/batch/mainProcess/batchRun.js";

export default async function cli() {
  return await yargs(hideBin(process.argv))
    .command(
      "foo",
      "describe",
      (yargs) => {
        return yargs.options({
          workspaceDir: {
            alias: "w",
            type: "string",
            describe: "The workspace to run against",
            demandOption: true,
          },
          startPackageNames: {
            describe: "",
            array: true,
            type: "string",
            default: [] as string[],
          },
          removeNamespaces: {
            default: true,
          },
          removeFauxNamespaces: {
            default: true,
          },
          fixDownstream: {
            default: true,
          },
          organizeImports: {
            describe: "Whether or not to organise imports",
            type: "boolean",
            default: true,
          },
          dryRun: {
            describe: "Whether to run without saving changes",
            type: "boolean",
            default: false,
          },
        } as const satisfies { [key: string]: Options });
      },
      async ({
        workspaceDir,
        startPackageNames,
        dryRun,
        removeNamespaces,
        removeFauxNamespaces,
        fixDownstream,
        organizeImports,
      }) => {
        await batchRun(workspaceDir, {
          startProjects: startPackageNames,
          dryRun,
          organizeImports,
          removeFauxNamespaces,
          removeNamespaces,
          fixDownstream,
          logDir: "", // FIXME
        });
      }
    )
    // .command(
    //   "singlePackageRun",
    //   "run against a single package no extras",
    //   (yargs) => {
    //     return yargs.options({
    //       packagePath: {
    //         type: "string",
    //         demandOption: false,
    //         defaultDescription: "cwd",
    //         default: process.cwd(),
    //         alias: "package",
    //       },
    //       changesDir: { type: "string" },
    //       dryRun: { type: "boolean", default: false },
    //       logLevel: {
    //         choices: ["fatal", "error", "warn", "info", "debug", "trace", "silent"],
    //         default: "info",
    //       },
    //     } as const);
    //   },
    //   ({ packagePath, logLevel, dryRun }) => {
    //     process.chdir(packagePath);

    //     const logger = createConsoleLogger(logLevel);

    //     try {
    //       processPackage(process.cwd(), { logger, dryRun, removeNamespaces: true });
    //     } finally {
    //       logger.flush();
    //     }
    //   }
    // )
    .strict()
    .showHelpOnFail(true)
    .parseAsync();
}

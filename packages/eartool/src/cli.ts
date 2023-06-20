#!/usr/bin/env node

import type { Argv } from "yargs";
import yargsEntry from "yargs";
import { hideBin } from "yargs/helpers";
import { registerFixNamespaceCommand } from "@eartool/command-fix-namespace";
import { refactorCommand } from "@eartool/command-refactor";

type Fn = (a: Argv<NonNullable<unknown>>) => Argv<NonNullable<unknown>>;

export default async function cli() {
  const cmds: Fn[] = [
    (yargs) => yargs.config(),
    registerFixNamespaceCommand!,
    refactorCommand!,
    (yargs) => yargs.strict().demandCommand().showHelpOnFail(true),
  ];

  return await cmds
    .reduce((yargs, curCommand) => curCommand(yargs), yargsEntry(hideBin(process.argv)))
    .parseAsync();
}

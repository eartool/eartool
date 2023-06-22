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

  const rootYargs = yargsEntry(hideBin(process.argv));
  rootYargs.wrap(rootYargs.terminalWidth());

  return await cmds.reduce((yargs, curCommand) => curCommand(yargs), rootYargs).parseAsync();
}

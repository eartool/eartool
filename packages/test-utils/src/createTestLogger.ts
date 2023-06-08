import { getSimplifiedNodeInfoAsString } from "@eartool/utils";
import { expect } from "@jest/globals";
import * as Assert from "node:assert";
import { fileURLToPath } from "node:url";
import { pino, type Logger } from "pino";
import pinoCaller from "pino-caller";
import pinoPretty from "pino-pretty";
import { Node } from "ts-morph";

let lastCreated: Logger | undefined;
let lastCreatedTestPath: string | undefined;

export function createTestLogger(): Logger {
  const { currentTestName, testPath } = expect.getState();
  Assert.ok(currentTestName != null);

  if (lastCreatedTestPath !== testPath || !lastCreated) {
    const logger = pinoCaller.default(
      pino(
        {
          level: "trace",
          serializers: {
            ...pino.stdSerializers,
            primaryNode: getSimplifiedNodeInfoAsString,
          },
          hooks: {
            logMethod: function logMethod([msg, ...args], method, _foo) {
              args = args.map((a) => maybeConvertNodeToFileAndLineNum(a));
              // console.log([msg, ...args]);
              method.apply(this, [msg, ...args]);
            },
          },
        },
        pino.multistream([
          {
            level: "trace",
            stream: pino.destination({
              sync: true,
              mkdir: true,
              dest: `${testPath}.log.json`,
            }),
          },
          {
            level: "trace",
            stream: pinoPretty.default({
              colorize: true,
              colorizeObjects: false,
              sync: true,
              singleLine: false,
              customPrettifiers: {
                caller: (a) => `${a}\n`,
              },
              destination: pino.destination({
                sync: true,
                mkdir: true,
                append: false,
                dest: `${testPath}.log`,
              }),
            }),
          },
        ])
      ),
      { stackAdjustment: 1, relativeTo: fileURLToPath(new URL("../../../", import.meta.url)) }
    );

    logger.setBindings({ currentTestName });

    lastCreatedTestPath = testPath;
    lastCreated = logger;
  }

  lastCreated.info(`New logger 'creation' for ${currentTestName}`);
  return lastCreated;
}
export function maybeConvertNodeToFileAndLineNum(a: any): any {
  if (a instanceof Node) {
    return `${a.getSourceFile().getFilePath()}:${a.getStartLineNumber()}`;
  }

  return a;
}

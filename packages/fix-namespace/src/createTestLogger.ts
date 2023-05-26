import { expect } from "@jest/globals";
import type { Node } from "ts-morph";
import { pino, type Logger } from "pino";
import pinoPretty from "pino-pretty";
import * as Assert from "node:assert";
import { maybeConvertNodeToFileAndLineNum } from "./processProject.test.js";

let lastCreated: Logger | undefined;
let lastCreatedTestPath: string | undefined;

export function createTestLogger(): Logger {
  const { currentTestName, testPath } = expect.getState();
  Assert.ok(currentTestName != null);

  if (lastCreatedTestPath !== testPath || !lastCreated) {
    const logger = pino(
      {
        level: "trace",
        serializers: {
          ...pino.stdSerializers,
          foo: (n: Node) => `${n.getSourceFile().getFilePath()}:${n.getStartLineNumber()}`,
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
            sync: true,
            singleLine: false,
            destination: pino.destination({
              sync: true,
              mkdir: true,
              append: false,
              dest: `${testPath}.log`,
            }),
          }),
        },
      ])
    );

    logger.setBindings({ currentTestName });

    lastCreatedTestPath = testPath;
    lastCreated = logger;
  }

  lastCreated.info(`New logger 'creation' for ${currentTestName}`);
  return lastCreated;
}

import * as path from "node:path";
import { pino, type LevelWithSilent } from "pino";
import pinoPretty from "pino-pretty";

export function createLogger(logDir: string, level: LevelWithSilent, includeConsole?: boolean) {
  return pino(
    {
      level,
    },
    pino.multistream([
      ...(includeConsole
        ? [
            {
              level: "trace" as const,
              stream: pinoPretty.default({
                colorize: true,
                sync: true,
              }),
            },
          ]
        : []),
      {
        level: "trace",
        stream: pino.destination({
          sync: true,
          mkdir: true,
          dest: path.join(logDir, "log.json"),
        }),
      },
      {
        level: "trace",
        stream: pinoPretty.default({
          colorize: false,
          sync: true,
          singleLine: false,
          destination: pino.destination({
            sync: true,
            mkdir: true,
            append: false,
            dest: path.join(logDir, "log.txt"),
          }),
        }),
      },
    ])
  );
}

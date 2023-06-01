import * as path from "node:path";
import type { DestinationStream, StreamEntry } from "pino";
import { pino, type LevelWithSilent } from "pino";
import pinoPretty from "pino-pretty";
import chalk from "chalk";

interface Opts {
  level: LevelWithSilent;
  consoleLevel?: LevelWithSilent;
  jsonLevel?: LevelWithSilent;
  txtLevel?: LevelWithSilent;
  extraStreams?: (StreamEntry | DestinationStream)[];
}

export function createLogger(
  logDir: string,
  {
    consoleLevel = "silent",
    jsonLevel = "trace",
    txtLevel = "trace",
    extraStreams = [],
    level,
  }: Opts
) {
  const streams: (StreamEntry | DestinationStream)[] = [];
  if (consoleLevel != "silent") {
    streams.push({
      level: "info" as const,
      stream: pinoPretty.default({
        messageFormat: (a) => `[${chalk.gray(a.packageName ?? "MAIN")}] ${a.msg}`,
        ignore: "packageName,pid,hostame",
        include: "time,level",
        colorize: true,
        sync: true,
      }),
    });
  }

  if (jsonLevel != "silent") {
    streams.push({
      level: "trace",
      stream: pino.destination({
        sync: true,
        mkdir: true,
        dest: path.join(logDir, "log.json"),
      }),
    });
  }

  if (txtLevel != "silent") {
    streams.push({
      level: "trace",
      stream: pinoPretty.default({
        colorize: false,
        sync: true,
        singleLine: false,
        translateTime: "SYS:standard",
        destination: pino.destination({
          sync: true,
          mkdir: true,
          append: false,
          dest: path.join(logDir, "log.txt"),
        }),
      }),
    });
  }

  streams.push(...extraStreams);

  return pino({ level }, pino.multistream(streams));
}

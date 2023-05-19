import { pino, type LevelWithSilent } from "pino";
import pinoPretty from "pino-pretty";

export function createConsoleLogger(level: LevelWithSilent) {
  return pino(
    {
      level,
    },
    pinoPretty.default({
      colorize: true,
      sync: true,
    })
  );
}

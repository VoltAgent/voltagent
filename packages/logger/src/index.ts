export {
  createPinoLogger,
  getGlobalLogBuffer,
  getGlobalLoggerProvider,
  setGlobalLoggerProvider,
  connectExternalLogBuffer,
  type LoggerWithBuffer,
} from "./base";

export { InMemoryLogBuffer } from "./buffer";

export { getDefaultLogLevel, getDefaultLogFormat, getDefaultRedactionPaths } from "./formatters";

export type { Logger, LoggerOptions, LogEntry, LogFilter, LogBuffer } from "./types";

export type { LoggerProvider, LoggerWithProvider } from "./providers";

export { PinoLoggerProvider } from "./providers";

// Re-export Pino types for convenience
export type { LoggerOptions as PinoLoggerOptions } from "pino";

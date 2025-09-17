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

// Export OpenTelemetry bridge
export {
  PinoOpenTelemetryBridge,
  getPinoOpenTelemetryBridge,
  initializePinoOpenTelemetry,
  isOpenTelemetryEnabled,
} from "./otel/bridge";

// Register the bridge initializer function on globalThis for core package to use
// This allows @voltagent/core to initialize the bridge without importing this package
import { initializePinoOpenTelemetry } from "./otel/bridge";

// @ts-expect-error - globalThis is not typed for our custom property
if (!globalThis.___voltagent_init_pino_otel_bridge) {
  // @ts-expect-error - globalThis is not typed for our custom property
  globalThis.___voltagent_init_pino_otel_bridge = initializePinoOpenTelemetry;
}

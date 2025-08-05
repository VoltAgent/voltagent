import type { LogBuffer, Logger } from "@voltagent/internal";
import { AgentRegistry } from "../server/registry";
import { createConsoleLogger, getDefaultLogBuffer } from "./console-logger";

// Export utilities
export * from "./events";
export * from "./logger-proxy";
export * from "./message-builder";
export * from "./buffered-logger";

// Re-export logger types from internal
export type { Logger, LogFn, LogEntry, LogFilter, LogBuffer } from "@voltagent/internal";

/**
 * Get the global logger instance from registry or create a default one
 */
export function getGlobalLogger(): Logger {
  const registry = AgentRegistry.getInstance();
  const globalLogger = registry.getGlobalLogger();

  if (globalLogger) {
    return globalLogger;
  }

  // Create and set default console logger if none exists
  const defaultLogger = createConsoleLogger({ name: "voltagent" });
  registry.setGlobalLogger(defaultLogger);
  return defaultLogger;
}

/**
 * Get the global log buffer
 */
export function getGlobalLogBuffer(): LogBuffer {
  return getDefaultLogBuffer();
}

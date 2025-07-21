import type { Logger, LogBuffer } from "@voltagent/internal";
import { AgentRegistry } from "../server/registry";
import { createConsoleLogger, getDefaultLogBuffer } from "./console-logger";

// Export domain-specific loggers
export * from "./agent-logger";
export * from "./workflow-logger";
export * from "./tool-logger";
export * from "./memory-logger";
export * from "./mcp-logger";
export * from "./types";
export * from "./events";

// Re-export logger types from internal
export type { Logger, LogFn, LogEntry, LogFilter, LogBuffer } from "@voltagent/internal";

// Try to load @voltagent/logger if available
let createLoggerFn: ((options: any) => Logger) | null = null;
let getGlobalLogBufferFn: (() => LogBuffer) | null = null;

try {
  // Dynamic import to make it optional
  const loggerModule = require("@voltagent/logger");
  if (loggerModule.createLogger) {
    createLoggerFn = loggerModule.createLogger;
  }
  if (loggerModule.getGlobalLogBuffer) {
    getGlobalLogBufferFn = loggerModule.getGlobalLogBuffer;
  }
} catch {
  // @voltagent/logger not installed, will use console logger
}

/**
 * Get the global logger instance from registry or create a default one
 */
export function getGlobalLogger(): Logger {
  const registry = AgentRegistry.getInstance();
  const globalLogger = registry.getGlobalLogger();

  if (globalLogger) {
    return globalLogger;
  }

  // Create and set default logger if none exists
  const defaultLogger = createLoggerFn
    ? createLoggerFn({ name: "voltagent" })
    : createConsoleLogger({ name: "voltagent" });

  registry.setGlobalLogger(defaultLogger);
  return defaultLogger;
}

/**
 * Create a logger with VoltAgent defaults
 */
export function createVoltAgentLogger(name?: string): Logger {
  return createLoggerFn
    ? createLoggerFn({ name: name || "voltagent" })
    : createConsoleLogger({ name: name || "voltagent" });
}

/**
 * Get the global log buffer
 */
export function getGlobalLogBuffer(): LogBuffer {
  return getGlobalLogBufferFn ? getGlobalLogBufferFn() : getDefaultLogBuffer();
}

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
export * from "./logger-proxy";

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
 * Create a logger with VoltAgent defaults
 */
export function createVoltAgentLogger(name?: string): Logger {
  return createConsoleLogger({ name: name || "voltagent" });
}

/**
 * Get the global log buffer
 */
export function getGlobalLogBuffer(): LogBuffer {
  return getDefaultLogBuffer();
}

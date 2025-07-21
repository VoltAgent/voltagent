import { createLogger, type Logger } from "@voltagent/logger";
import { AgentRegistry } from "../server/registry";

// Re-export everything from internal logger
export * from "@voltagent/logger";

// Export domain-specific loggers
export * from "./agent-logger";
export * from "./workflow-logger";
export * from "./tool-logger";
export * from "./memory-logger";
export * from "./mcp-logger";
export * from "./types";
export * from "./events";

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
  const defaultLogger = createLogger({
    name: "voltagent",
  });

  registry.setGlobalLogger(defaultLogger);
  return defaultLogger;
}

/**
 * Create a logger with VoltAgent defaults
 */
export function createVoltAgentLogger(name?: string): Logger {
  return createLogger({
    name: name || "voltagent",
  });
}

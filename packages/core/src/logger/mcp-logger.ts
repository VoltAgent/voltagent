import type { Logger } from "@voltagent/internal";
import type { MCPLoggerContext } from "./types";

/**
 * Create a logger instance for MCP operations
 */
export function createMCPLogger(parentLogger: Logger, context: MCPLoggerContext): Logger {
  // Create child logger with MCP context
  return parentLogger.child({
    component: `MCP:${context.serverName}`,
    ...context,
  });
}

/**
 * Log MCP connection events
 */
export function logMCPConnection(
  logger: Logger,
  event: "connect" | "disconnect" | "error" | "reconnect",
  data?: Record<string, any>,
): void {
  const logData = {
    event: `mcp_${event}`,
    ...data,
  };

  switch (event) {
    case "connect":
      logger.info(logData, `MCP server connected: ${data?.serverName}`);
      break;
    case "disconnect":
      logger.info(logData, `MCP server disconnected: ${data?.serverName}`);
      break;
    case "error":
      logger.error(
        logData,
        `MCP connection error: ${data?.serverName} - ${data?.error?.message || "Unknown error"}`,
      );
      break;
    case "reconnect":
      logger.info(logData, `MCP server reconnecting: ${data?.serverName}`);
      break;
  }
}

/**
 * Log MCP method calls
 */
export function logMCPMethodCall(
  logger: Logger,
  method: string,
  phase: "request" | "response" | "error",
  data?: Record<string, any>,
): void {
  const logData = {
    event: "mcp_method_call",
    method,
    phase,
    ...data,
  };

  switch (phase) {
    case "request":
      logger.debug(logData, `MCP method called: ${method}`);
      break;
    case "response":
      logger.debug(
        {
          ...logData,
          duration: data?.duration,
        },
        `MCP method response: ${method} (${data?.duration}ms)`,
      );
      break;
    case "error":
      logger.error(
        logData,
        `MCP method error: ${method} - ${data?.error?.message || "Unknown error"}`,
      );
      break;
  }
}

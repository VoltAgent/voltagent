import type { Logger } from "@voltagent/internal";
import type { AgentLoggerContext, AgentLoggerOptions } from "./types";

/**
 * Create a logger instance for agent operations
 */
export function createAgentLogger(
  parentLogger: Logger,
  context: AgentLoggerContext,
  options?: AgentLoggerOptions,
): Logger {
  const logger = options?.logger || parentLogger;

  // Create child logger with agent context
  return logger.child({
    component: `Agent:${context.agentName || context.agentId}`,
    ...context,
    ...(options?.context || {}),
  });
}

/**
 * Log agent lifecycle events
 */
export function logAgentEvent(
  logger: Logger,
  event: "start" | "complete" | "error" | "tool_call" | "memory_access",
  data?: Record<string, any>,
): void {
  const logData = {
    event: `agent_${event}`,
    ...data,
  };

  switch (event) {
    case "error":
      logger.error(logData, `Agent error: ${data?.error?.message || "Unknown error"}`);
      break;
    case "start":
      logger.info(logData, "Agent started processing");
      break;
    case "complete":
      logger.info(logData, "Agent completed processing");
      break;
    case "tool_call":
      logger.debug(logData, `Agent calling tool: ${data?.toolName}`);
      break;
    case "memory_access":
      logger.debug(logData, `Agent accessing memory: ${data?.operation}`);
      break;
  }
}

/**
 * Log agent streaming events
 */
export function logAgentStreamEvent(
  logger: Logger,
  eventType: string,
  data?: Record<string, any>,
): void {
  logger.debug(
    {
      event: "agent_stream",
      eventType,
      ...data,
    },
    `Agent stream event: ${eventType}`,
  );
}

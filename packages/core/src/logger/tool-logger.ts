import type { Logger } from "@voltagent/internal";
import type { ToolLoggerContext } from "./types";
import { LogEvents } from "./events";

/**
 * Truncate or summarize large payloads for logging
 */
function truncateOrSummarize(data: any, maxLength: number = 200): any {
  if (data === null || data === undefined) {
    return data;
  }

  const str = typeof data === "string" ? data : JSON.stringify(data);

  if (str.length <= maxLength) {
    return data;
  }

  // For strings, truncate
  if (typeof data === "string") {
    return str.substring(0, maxLength) + "...";
  }

  // For objects/arrays, return summary
  return {
    type: Array.isArray(data) ? "array" : typeof data,
    length: Array.isArray(data) ? data.length : Object.keys(data).length,
    preview: str.substring(0, maxLength) + "...",
    truncated: true,
  };
}

/**
 * Create a logger instance for tool operations
 */
export function createToolLogger(parentLogger: Logger, context: ToolLoggerContext): Logger {
  // Create child logger with tool context
  return parentLogger.child({
    component: `Tool:${context.toolName}`,
    ...context,
  });
}

/**
 * Log tool execution lifecycle
 */
export function logToolExecution(
  logger: Logger,
  phase: "start" | "complete" | "error",
  data?: Record<string, any>,
): void {
  switch (phase) {
    case "start":
      // Log essential info at INFO level with args visible
      logger.info(
        {
          event: LogEvents.TOOL_EXECUTION_STARTED,
          toolName: data?.toolName,
          executionId: data?.executionId,
          userId: data?.userId,
          conversationId: data?.conversationId,
          agentId: data?.agentId,
          args: data?.input ? truncateOrSummarize(data.input, 200) : undefined,
        },
        `Executing tool`,
      );

      // Log full input at DEBUG level
      if (data?.input) {
        logger.debug(
          {
            event: `${LogEvents.TOOL_EXECUTION_STARTED}.details`,
            toolName: data?.toolName,
            executionId: data?.executionId,
            fullInput: data.input,
          },
          `Tool ${data?.toolName} full input`,
        );
      }
      break;

    case "complete":
      // Log essential info at INFO level with result visible
      logger.info(
        {
          event: LogEvents.TOOL_EXECUTION_COMPLETED,
          toolName: data?.toolName,
          executionId: data?.executionId,
          userId: data?.userId,
          conversationId: data?.conversationId,
          agentId: data?.agentId,
          duration: data?.duration,
          success: true,
          result: data?.output ? truncateOrSummarize(data.output, 200) : undefined,
        },
        `Execution completed (${data?.duration}ms)`,
      );

      // Log full output at DEBUG level
      if (data?.output) {
        logger.debug(
          {
            event: `${LogEvents.TOOL_EXECUTION_COMPLETED}.details`,
            toolName: data?.toolName,
            executionId: data?.executionId,
            fullOutput: data.output,
          },
          `Tool ${data?.toolName} full output`,
        );
      }
      break;

    case "error":
      logger.error(
        {
          event: LogEvents.TOOL_EXECUTION_FAILED,
          toolName: data?.toolName,
          executionId: data?.executionId,
          userId: data?.userId,
          conversationId: data?.conversationId,
          agentId: data?.agentId,
          duration: data?.duration,
          success: false,
          error: data?.error
            ? {
                message: data.error.message,
                type: data.error.constructor?.name || "Error",
                // Include stack trace only in development
                ...(process.env.NODE_ENV !== "production" && { stack: data.error.stack }),
              }
            : "Unknown error",
        },
        `Tool execution failed: ${data?.toolName} - ${data?.error?.message || "Unknown error"}`,
      );
      break;
  }
}

/**
 * Log tool validation events
 */
export function logToolValidation(
  logger: Logger,
  toolName: string,
  isValid: boolean,
  validationError?: string,
): void {
  if (isValid) {
    logger.debug(
      {
        event: LogEvents.TOOL_VALIDATION_PASSED,
        toolName,
        valid: true,
      },
      `Tool validation passed: ${toolName}`,
    );
  } else {
    logger.warn(
      {
        event: LogEvents.TOOL_VALIDATION_FAILED,
        toolName,
        valid: false,
        error: validationError,
      },
      `Tool validation failed: ${toolName} - ${validationError}`,
    );
  }
}

import type { ServerProviderDeps } from "@voltagent/core/edge";
import { getGlobalLogBuffer } from "@voltagent/core/edge";
import type { LogEntry, LogFilter, LogLevel, Logger } from "@voltagent/internal";
import type { ApiResponse } from "../types";

/**
 * Log filter options for querying logs
 */
export interface LogFilterOptions {
  limit?: number;
  level?: LogLevel;
  agentId?: string;
  conversationId?: string;
  workflowId?: string;
  executionId?: string;
  since?: string | Date;
  until?: string | Date;
}

export interface LogHandlerResponse {
  logs: LogEntry[];
  total: number;
  query: LogFilter;
}

/**
 * Handler for getting logs with filters
 * Returns filtered log entries
 */
export async function handleGetLogs(
  options: LogFilterOptions,
  _deps: ServerProviderDeps,
  logger: Logger,
): Promise<ApiResponse<LogHandlerResponse>> {
  try {
    const logBuffer = getGlobalLogBuffer();
    const limit = options.limit || 100;

    const filter = {
      level: options.level,
      agentId: options.agentId,
      workflowId: options.workflowId,
      conversationId: options.conversationId,
      executionId: options.executionId,
      since: options.since ? new Date(options.since) : undefined,
      until: options.until ? new Date(options.until) : undefined,
      limit,
    };

    const logs = logBuffer.query(filter);

    return {
      success: true,
      data: {
        logs,
        total: logs.length,
        query: filter,
      },
    };
  } catch (error) {
    logger.error("Failed to get logs", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

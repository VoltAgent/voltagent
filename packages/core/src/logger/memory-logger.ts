import type { Logger } from "@voltagent/internal";
import type { MemoryLoggerContext } from "./types";
import { LogEvents } from "./events";

/**
 * Create a logger instance for memory operations
 */
export function createMemoryLogger(parentLogger: Logger, context: MemoryLoggerContext): Logger {
  // Create child logger with memory context
  return parentLogger.child({
    component: `Memory:${context.memoryType}`,
    ...context,
  });
}

/**
 * Log memory operation events
 */
export function logMemoryOperation(
  logger: Logger,
  operation: "read" | "write" | "delete" | "clear",
  success: boolean,
  data?: Record<string, any>,
): void {
  const logData = {
    event: success ? LogEvents.MEMORY_OPERATION_COMPLETED : LogEvents.MEMORY_OPERATION_FAILED,
    operation,
    success,
    ...data,
  };

  if (success) {
    logger.trace(
      logData,
      `Memory ${operation} successful${data?.recordCount ? ` (${data.recordCount} records)` : ""}`,
    );
  } else {
    logger.error(logData, `Memory ${operation} failed: ${data?.error?.message || "Unknown error"}`);
  }
}

/**
 * Log memory cache events
 */
export function logMemoryCacheEvent(
  logger: Logger,
  event: "hit" | "miss" | "evict",
  key: string,
  data?: Record<string, any>,
): void {
  const eventMap = {
    hit: LogEvents.MEMORY_CACHE_HIT,
    miss: LogEvents.MEMORY_CACHE_MISS,
    evict: LogEvents.MEMORY_CACHE_EVICTED,
  };

  logger.trace(
    {
      event: eventMap[event],
      key,
      ...data,
    },
    `Memory cache ${event}: ${key}`,
  );
}

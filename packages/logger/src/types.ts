// Re-export shared types from internal package
export type { Logger, LogFn, LogLevel } from "@voltagent/internal";
import type { LogLevel } from "@voltagent/internal";

import type { LoggerOptions as PinoLoggerOptions } from "pino";

// Re-export for convenience
export type { PinoLoggerOptions };

/**
 * Provider-agnostic logger options
 */
export interface LoggerOptions {
  /**
   * Log level
   * @default "error" in production, "info" in development
   */
  level?: LogLevel;

  /**
   * Log format type
   * @default "json" in production, "pretty" in development
   */
  format?: "json" | "pretty";

  /**
   * Enable pretty printing in development
   * @default true if NODE_ENV !== "production"
   */
  pretty?: boolean;

  /**
   * Fields to redact from logs
   * @default ["password", "token", "apiKey", "secret"]
   */
  redact?: string[];

  /**
   * Maximum buffer size for in-memory log storage
   * @default 1000
   */
  bufferSize?: number;

  /**
   * Custom name for the logger instance
   */
  name?: string;

  /**
   * Pino-specific options to override defaults
   */
  pinoOptions?: PinoLoggerOptions;

  /**
   * Additional provider-specific options
   */
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  msg: string;
  component?: string;
  agentId?: string;
  conversationId?: string;
  workflowId?: string;
  executionId?: string;
  userId?: string;
  [key: string]: any;
}

export interface LogFilter {
  level?: LogLevel;
  agentId?: string;
  conversationId?: string;
  workflowId?: string;
  executionId?: string;
  since?: Date;
  until?: Date;
  limit?: number;
}

export interface LogBuffer {
  add(entry: LogEntry): void;
  query(filter?: LogFilter): LogEntry[];
  clear(): void;
  size(): number;
}

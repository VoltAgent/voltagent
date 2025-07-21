// Re-export shared types from internal package
export type { Logger, LogFn } from "@voltagent/internal";

/**
 * Provider-agnostic logger options
 */
export interface LoggerOptions {
  /**
   * Log level
   * @default "info" in production, "debug" in development
   */
  level?: string;

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
   * Additional provider-specific options
   */
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: string;
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
  level?: string;
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

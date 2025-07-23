/**
 * Shared logger types for VoltAgent
 * These types define the minimal logger interface that both core and logger packages use
 */

/**
 * Valid log levels
 */
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal" | "silent";

/**
 * Log function signatures
 */
export interface LogFn {
  (msg: string, context?: object): void;
}

/**
 * Minimal logger interface for VoltAgent
 * This interface is implemented by @voltagent/logger and can be implemented by other logging solutions
 */
export interface Logger {
  /**
   * Log at trace level - most detailed level
   */
  trace: LogFn;

  /**
   * Log at debug level - detailed information for debugging
   */
  debug: LogFn;

  /**
   * Log at info level - general informational messages
   */
  info: LogFn;

  /**
   * Log at warn level - warning messages
   */
  warn: LogFn;

  /**
   * Log at error level - error messages
   */
  error: LogFn;

  /**
   * Log at fatal level - fatal error messages
   */
  fatal: LogFn;

  /**
   * Create a child logger with additional context
   * @param bindings - Additional context to bind to the child logger
   */
  child(bindings: Record<string, any>): Logger;
}

/**
 * Logger options for configuration
 */
export interface LoggerOptions {
  /**
   * Log level
   */
  level?: string;

  /**
   * Logger name
   */
  name?: string;

  /**
   * Additional options specific to the logger implementation
   */
  [key: string]: any;
}

/**
 * Log entry structure
 */
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

/**
 * Log filter for querying logs
 */
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

/**
 * Log buffer interface for storing logs in memory
 */
export interface LogBuffer {
  add(entry: LogEntry): void;
  query(filter?: LogFilter): LogEntry[];
  clear(): void;
  size(): number;
}

import type { Logger, LoggerOptions, LogBuffer } from "../types";

/**
 * Logger provider interface for implementing different logging backends
 */
export interface LoggerProvider {
  /**
   * Provider name
   */
  name: string;

  /**
   * Create a new logger instance
   */
  createLogger(options?: LoggerOptions): LoggerWithProvider;

  /**
   * Create a child logger with additional context
   */
  createChildLogger(parent: Logger, bindings: Record<string, any>, options?: LoggerOptions): Logger;

  /**
   * Get the log buffer associated with this provider
   */
  getLogBuffer(): LogBuffer;

  /**
   * Flush any pending logs
   */
  flush?(): Promise<void>;

  /**
   * Close the logger provider
   */
  close?(): Promise<void>;
}

/**
 * Extended logger with provider access
 */
export interface LoggerWithProvider extends Logger {
  /**
   * Get the underlying provider
   */
  getProvider(): LoggerProvider;

  /**
   * Get the log buffer
   */
  getBuffer(): LogBuffer;
}

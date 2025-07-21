import { PinoLoggerProvider } from "./providers";
import type { LoggerOptions } from "./types";
import type { LoggerProvider, LoggerWithProvider } from "./providers";

// Global logger provider instance
let globalLoggerProvider: LoggerProvider | null = null;

/**
 * Get or create the global logger provider
 */
export function getGlobalLoggerProvider(): LoggerProvider {
  if (!globalLoggerProvider) {
    globalLoggerProvider = new PinoLoggerProvider();
  }
  return globalLoggerProvider;
}

/**
 * Set a custom logger provider
 */
export function setGlobalLoggerProvider(provider: LoggerProvider): void {
  globalLoggerProvider = provider;
}

/**
 * Get the global log buffer
 */
export function getGlobalLogBuffer() {
  return getGlobalLoggerProvider().getLogBuffer();
}

/**
 * Extended logger with buffer access (for backward compatibility)
 */
export type LoggerWithBuffer = LoggerWithProvider;

/**
 * Create a new logger instance with log buffer support
 */
export function createLogger(options?: LoggerOptions): LoggerWithBuffer {
  const provider = getGlobalLoggerProvider();
  return provider.createLogger(options);
}

/**
 * Default logger instance
 */
export const logger = createLogger();

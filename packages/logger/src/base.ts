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
 * Create a new Pino logger instance
 */
export function createPinoLogger(options?: LoggerOptions): LoggerWithBuffer {
  const provider = new PinoLoggerProvider(options?.bufferSize);
  if (!globalLoggerProvider) {
    globalLoggerProvider = provider;
  }
  return provider.createLogger(options);
}

import { PinoLoggerProvider } from "./providers";
import type { LoggerProvider, LoggerWithProvider } from "./providers";
import type { LogBuffer, LoggerOptions } from "./types";

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
 * @param options Logger options including pinoOptions
 * @param externalLogBuffer Optional external log buffer to sync logs to (deprecated)
 */
export function createPinoLogger(
  options?: LoggerOptions,
  _externalLogBuffer?: any, // Deprecated - kept for backward compatibility
): LoggerWithBuffer {
  const provider = new PinoLoggerProvider(
    options?.bufferSize,
    undefined, // No longer using external buffer
    options?.pinoOptions,
  );
  if (!globalLoggerProvider) {
    globalLoggerProvider = provider;
  }
  return provider.createLogger(options);
}

/**
 * Connect an external log buffer to the existing logger
 * @deprecated Buffer management is now handled by @voltagent/core. This function does nothing.
 */
export function connectExternalLogBuffer(
  _logger: LoggerWithProvider,
  _externalBuffer: LogBuffer,
): void {
  // Deprecated - buffer management is now handled by core package
  // This function is kept for backward compatibility but does nothing
}

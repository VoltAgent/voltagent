import { PinoLoggerProvider } from "./providers";
import type { LoggerProvider, LoggerWithProvider } from "./providers";
import type { LogBuffer, LoggerOptions } from "./types";

/**
 * Get (or auto-create if not exists) the global logger provider
 */
export function getGlobalLoggerProvider(): LoggerProvider {
  // @ts-expect-error - globalThis is not typed
  const globalLoggerProvider = globalThis.___voltagent_logger_provider as
    | LoggerProvider
    | undefined;

  if (!globalLoggerProvider) {
    // @ts-expect-error - globalThis is not typed
    globalThis.___voltagent_logger_provider = new PinoLoggerProvider();
  }

  // @ts-expect-error - globalThis is not typed
  return globalThis.___voltagent_logger_provider as LoggerProvider;
}

/**
 * Set the global logger provider
 */
export function setGlobalLoggerProvider(provider: LoggerProvider): void {
  // @ts-expect-error - globalThis is not typed
  globalThis.___voltagent_logger_provider = provider;
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

  const globalLoggerProvider = getGlobalLoggerProvider();
  if (!globalLoggerProvider) {
    setGlobalLoggerProvider(provider);
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

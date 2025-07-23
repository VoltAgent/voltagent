import { PinoLoggerProvider } from "./providers";
import type { LoggerOptions, LogBuffer } from "./types";
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
 * @param options Logger options including pinoOptions
 * @param externalLogBuffer Optional external log buffer to sync logs to
 */
export function createPinoLogger(
  options?: LoggerOptions,
  externalLogBuffer?: any,
): LoggerWithBuffer {
  const provider = new PinoLoggerProvider(
    options?.bufferSize,
    externalLogBuffer,
    options?.pinoOptions,
  );
  if (!globalLoggerProvider) {
    globalLoggerProvider = provider;
  }
  return provider.createLogger(options);
}

/**
 * Connect an external log buffer to the existing logger
 * This allows the logger to sync logs to an external buffer (e.g., core package's global buffer)
 */
export function connectExternalLogBuffer(
  logger: LoggerWithProvider,
  externalBuffer: LogBuffer,
): void {
  const provider = logger.getProvider();
  if (provider && provider.name === "pino" && provider instanceof PinoLoggerProvider) {
    // Access the private property using type assertion
    (provider as any).externalLogBuffer = externalBuffer;
  }
}

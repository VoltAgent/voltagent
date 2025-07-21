import pino from "pino";
import { InMemoryLogBuffer } from "../buffer";
import { createPinoOptions } from "../formatters";
import type { Logger, LoggerOptions, LogBuffer, LogEntry } from "../types";
import type { LoggerProvider, LoggerWithProvider } from "./interface";

/**
 * Pino-based logger provider
 */
export class PinoLoggerProvider implements LoggerProvider {
  name = "pino";
  private logBuffer: LogBuffer;

  constructor(bufferSize?: number) {
    const size = bufferSize || parseInt(process.env.VOLTAGENT_LOG_BUFFER_SIZE || "1000", 10);
    this.logBuffer = new InMemoryLogBuffer(size);
  }

  createLogger(options?: LoggerOptions): LoggerWithProvider {
    const pinoOptions = createPinoOptions(options);
    const pinoLogger = pino(pinoOptions) as Logger;

    // Setup log capture
    this.setupLogCapture(pinoLogger);

    // Create a proxy object that includes both pino logger methods and our custom methods
    const loggerWithProvider = Object.assign(pinoLogger, {
      getProvider: () => this,
      getBuffer: () => this.logBuffer,
    }) as LoggerWithProvider;

    return loggerWithProvider;
  }

  createChildLogger(
    parent: Logger,
    bindings: Record<string, any>,
    _options?: LoggerOptions,
  ): Logger {
    const childLogger = parent.child(bindings);

    // If parent has provider methods, add them to child
    if ("getProvider" in parent) {
      return Object.assign(childLogger, {
        getProvider: () => this,
        getBuffer: () => this.logBuffer,
      }) as LoggerWithProvider;
    }

    return childLogger;
  }

  getLogBuffer(): LogBuffer {
    return this.logBuffer;
  }

  async flush(): Promise<void> {
    // Pino doesn't have built-in flush, but we can ensure stream is flushed
    return Promise.resolve();
  }

  async close(): Promise<void> {
    // Clear the buffer on close
    this.logBuffer.clear();
    return Promise.resolve();
  }

  /**
   * Setup log capture for buffer
   */
  private setupLogCapture(pinoLogger: Logger): void {
    // Intercept the write stream to capture logs
    const stream = (pinoLogger as any)[pino.symbols.streamSym];
    if (stream && stream.write) {
      const originalWrite = stream.write.bind(stream);

      stream.write = (chunk: any) => {
        // Call original write
        originalWrite(chunk);

        // Try to parse and capture the log
        try {
          if (typeof chunk === "string") {
            const logEntry = JSON.parse(chunk.trim()) as LogEntry;
            this.logBuffer.add(logEntry);
          }
        } catch {
          // Ignore parse errors for non-JSON logs
        }
      };
    }
  }
}

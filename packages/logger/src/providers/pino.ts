import pino from "pino";
import type { LoggerOptions as PinoLoggerOptions } from "pino";
import { InMemoryLogBuffer } from "../buffer";
import { getDefaultLogLevel, getDefaultLogFormat, getDefaultRedactionPaths } from "../formatters";
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
    const pinoOptions = this.createPinoOptions(options);
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
   * Create Pino-specific options from generic logger options
   */
  private createPinoOptions(options: LoggerOptions = {}): PinoLoggerOptions {
    const format = options.format || getDefaultLogFormat();
    const pretty = options.pretty ?? process.env.NODE_ENV !== "production";
    const shouldUsePretty = format === "pretty" && pretty;

    const pinoOptions: PinoLoggerOptions = {
      level: options.level || getDefaultLogLevel(),
      name: options.name,
      redact: {
        paths: options.redact || getDefaultRedactionPaths(),
        censor: "[REDACTED]",
      },
      formatters: {
        level: (label) => {
          return { level: label.toUpperCase() };
        },
        bindings: (bindings) => {
          // Add VoltAgent-specific bindings
          return {
            ...bindings,
            component: "VoltAgent",
            pid: bindings.pid,
            hostname: bindings.hostname,
          };
        },
      },
      timestamp: () => {
        const now = new Date();
        const offset = -now.getTimezoneOffset();
        const offsetHours = Math.floor(Math.abs(offset) / 60);
        const offsetMinutes = Math.abs(offset) % 60;
        const offsetSign = offset >= 0 ? "+" : "-";
        const offsetString = `${offsetSign}${offsetHours.toString().padStart(2, "0")}${offsetMinutes.toString().padStart(2, "0")}`;
        return `,"timestamp":"${now.toISOString().replace("Z", "")} ${offsetString}"`;
      },
      base: {
        env: process.env.NODE_ENV || "development",
      },
    };

    // Add pretty transport only in development
    if (shouldUsePretty) {
      pinoOptions.transport = {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "yyyy-MM-dd HH:mm:ss.l o",
          ignore: "pid,hostname,env,component",
          messageFormat:
            "[{component}] {msg}{if userId} | user={userId}{end}{if conversationId} conv={conversationId}{end}{if agentId} agent={agentId}{end}{if toolName} tool={toolName}{end}",
          errorLikeObjectKeys: ["err", "error", "exception"],
          errorProps: "",
          singleLine: !["debug", "trace"].includes(options.level || getDefaultLogLevel()),
          messageKey: "msg",
        },
      };
    }

    // Remove VoltAgent-specific options before passing to Pino
    const { format: _, pretty: __, redact: ___, bufferSize: ____, ...restOptions } = options;

    return {
      ...pinoOptions,
      ...restOptions,
    };
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

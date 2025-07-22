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
  private externalLogBuffer?: LogBuffer;

  constructor(bufferSize?: number, externalLogBuffer?: LogBuffer) {
    const size = bufferSize || parseInt(process.env.VOLTAGENT_LOG_BUFFER_SIZE || "1000", 10);
    this.logBuffer = new InMemoryLogBuffer(size);
    this.externalLogBuffer = externalLogBuffer;
  }

  createLogger(options?: LoggerOptions): LoggerWithProvider {
    const pinoOptions = this.createPinoOptions(options);
    const pinoInstance = pino(pinoOptions);

    // Setup log capture
    this.setupLogCapture(pinoInstance);

    return this.wrapPinoInstance(pinoInstance);
  }

  private wrapPinoInstance(pinoInstance: any): LoggerWithProvider {
    // Create our logger that follows OUR interface
    const logger: Logger & { _pinoInstance?: any } = {
      trace: (msg: string, context?: object) => {
        pinoInstance.trace(context || {}, msg);
      },
      debug: (msg: string, context?: object) => {
        pinoInstance.debug(context || {}, msg);
      },
      info: (msg: string, context?: object) => {
        pinoInstance.info(context || {}, msg);
      },
      warn: (msg: string, context?: object) => {
        pinoInstance.warn(context || {}, msg);
      },
      error: (msg: string, context?: object) => {
        pinoInstance.error(context || {}, msg);
      },
      fatal: (msg: string, context?: object) => {
        pinoInstance.fatal(context || {}, msg);
      },
      child: (bindings: Record<string, any>) => {
        const childPino = pinoInstance.child(bindings);
        return this.wrapPinoInstance(childPino);
      },
    };

    // Store reference to pino instance for child logger creation
    logger._pinoInstance = pinoInstance;

    // Create a proxy object that includes our logger and custom methods
    const loggerWithProvider = Object.assign(logger, {
      getProvider: () => this,
      getBuffer: () => this.logBuffer,
    }) as LoggerWithProvider;

    return loggerWithProvider;
  }

  createChildLogger(
    parent: Logger & { _pinoInstance?: any },
    bindings: Record<string, any>,
    _options?: LoggerOptions,
  ): Logger {
    // Use the parent's pino instance if available
    if (parent._pinoInstance) {
      const childPino = parent._pinoInstance.child(bindings);
      return this.wrapPinoInstance(childPino);
    }

    // Fallback to parent's child method
    return parent.child(bindings);
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
        return `,"timestamp":"${now.toISOString()}"`;
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

            // Also add to external buffer if provided
            if (this.externalLogBuffer) {
              console.log(`[PinoLogger] Adding to external buffer: "${logEntry.msg}"`);
              this.externalLogBuffer.add(logEntry);
            } else {
              console.log(`[PinoLogger] No external buffer connected`);
            }
          }
        } catch {
          // Ignore parse errors for non-JSON logs
        }
      };
    }
  }
}

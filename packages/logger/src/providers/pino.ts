import pino from "pino";
import type { LoggerOptions as PinoLoggerOptions } from "pino";
import { getDefaultLogFormat, getDefaultLogLevel, getDefaultRedactionPaths } from "../formatters";
import type { LogBuffer, Logger, LoggerOptions } from "../types";
import type { LoggerProvider, LoggerWithProvider } from "./interface";

/**
 * Pino-based logger provider
 */
export class PinoLoggerProvider implements LoggerProvider {
  public name = "pino";
  private customPinoOptions?: PinoLoggerOptions;

  public constructor(
    _bufferSize?: number, // Kept for backward compatibility but not used anymore
    _externalLogBuffer?: LogBuffer, // Kept for backward compatibility but not used anymore
    pinoOptions?: PinoLoggerOptions,
  ) {
    this.customPinoOptions = pinoOptions;
  }

  public createLogger(options?: LoggerOptions): LoggerWithProvider {
    const pinoOptions = this.createPinoOptions(options);
    const pinoInstance = pino(pinoOptions);

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
      getBuffer: () => this.getLogBuffer(),
    }) as LoggerWithProvider;

    return loggerWithProvider;
  }

  public createChildLogger(
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

  public getLogBuffer(): LogBuffer {
    // Buffer management is now handled by core package
    throw new Error(
      "Buffer management has been moved to @voltagent/core. Loggers no longer manage their own buffers.",
    );
  }

  public async flush(): Promise<void> {
    // Pino logs synchronously by default, so no flush needed.
    // This method exists for LoggerProvider interface compatibility
    // and future async transport support.
    return Promise.resolve();
  }

  public async close(): Promise<void> {
    // Nothing to close - buffer management is handled by core
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
      serializers: {
        err: pino.stdSerializers.err,
        error: pino.stdSerializers.err,
        exception: pino.stdSerializers.err,
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
            "{msg}{if userId} | user={userId}{end}{if conversationId} | conv={conversationId}{end}{if executionId} | exec={executionId}{end}",
          errorLikeObjectKeys: ["err", "error", "exception"],
          errorProps: "",
          singleLine: !["debug", "trace"].includes(options.level || getDefaultLogLevel()),
          messageKey: "msg",
        },
      };
    }

    // Remove VoltAgent-specific options before passing to Pino
    const {
      format: _,
      pretty: __,
      redact: ___,
      bufferSize: ____,
      pinoOptions: _____,
      ...restOptions
    } = options;

    // Simple merge - user options override everything
    return {
      ...pinoOptions,
      ...restOptions,
      ...this.customPinoOptions,
    };
  }
}

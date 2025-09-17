import pino from "pino";
import type { LoggerOptions as PinoLoggerOptions } from "pino";
import pinoPretty from "pino-pretty";
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
    // If an OpenTelemetry LoggerProvider is already available globally,
    // initialize the Pino bridge before creating the Pino instance to ensure
    // instrumentation patches apply to this instance.
    try {
      const provider = (globalThis as any).___voltagent_otel_logger_provider;
      const init = (globalThis as any).___voltagent_init_pino_otel_bridge;
      if (provider && typeof init === "function") {
        init(provider);
      }
    } catch {
      // Best-effort only
    }

    const pinoOptions = this.createPinoOptions(options);
    const format = options?.format || getDefaultLogFormat();
    const pretty = options?.pretty ?? process.env.NODE_ENV !== "production";
    const shouldUsePretty = format === "pretty" && pretty;

    let stream: ReturnType<typeof pinoPretty> | undefined;
    if (shouldUsePretty) {
      // Create pretty stream directly (no worker threads)
      stream = pinoPretty({
        colorize: true,
        translateTime: "yyyy-mm-dd HH:MM:ss.l o",
        ignore: "pid,hostname,env,component",
        messageFormat:
          "{msg}{if userId} | user={userId}{end}{if conversationId} | conv={conversationId}{end}{if executionId} | exec={executionId}{end}",
        errorLikeObjectKeys: ["err", "error", "exception"],
        errorProps: "",
        singleLine: !["debug", "trace"].includes(options?.level || getDefaultLogLevel()),
        messageKey: "msg",
      });
    }

    // Pass stream as second parameter to avoid worker threads
    const pinoInstance = stream ? pino(pinoOptions, stream) : pino(pinoOptions);

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
    // Buffer management is now handled by OpenTelemetry
    throw new Error(
      "Buffer management has been replaced by OpenTelemetry Logs API. Use observability features instead.",
    );
  }

  public async flush(): Promise<void> {
    // Pino logs are now handled by OpenTelemetry which manages its own flushing
    return Promise.resolve();
  }

  public async close(): Promise<void> {
    // OpenTelemetry bridge shutdown is handled by VoltAgentObservability
    return Promise.resolve();
  }

  /**
   * Create Pino-specific options from generic logger options
   */
  private createPinoOptions(options: LoggerOptions = {}): PinoLoggerOptions {
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

    // Note: Pretty formatting is now handled via stream in createLogger method
    // to avoid worker thread issues in Next.js and other environments

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

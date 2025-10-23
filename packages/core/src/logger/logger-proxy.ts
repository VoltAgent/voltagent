import type { LogFn, Logger } from "@voltagent/internal";
import { getGlobalLogger } from "./index";

/**
 * LoggerProxy implements the Logger interface but delegates all calls to the current global logger.
 * This allows agents and workflows to be created before VoltAgent sets the global logger,
 * while still using the correct logger once it's available.
 *
 * When the logger package is not available, it also emits logs via OpenTelemetry Logs API.
 */
export class LoggerProxy implements Logger {
  private bindings: Record<string, any>;
  private externalLogger?: Logger;

  constructor(bindings: Record<string, any> = {}, externalLogger?: Logger) {
    this.bindings = bindings;
    this.externalLogger = externalLogger;
  }

  /**
   * Get the actual logger instance with bindings applied
   */
  private getActualLogger(): Logger {
    // Use external logger if provided, otherwise use global logger
    const baseLogger = this.externalLogger || getGlobalLogger();
    // Apply bindings if any
    return Object.keys(this.bindings).length > 0 ? baseLogger.child(this.bindings) : baseLogger;
  }

  trace: LogFn = (msg: string, context?: object): void => {
    const logger = this.getActualLogger();
    logger.trace(msg, context);
    // Note: OTEL emission is handled by the underlying logger (Pino or ConsoleLogger)
  };

  debug: LogFn = (msg: string, context?: object): void => {
    const logger = this.getActualLogger();
    logger.debug(msg, context);
    // Note: OTEL emission is handled by the underlying logger (Pino or ConsoleLogger)
  };

  info: LogFn = (msg: string, context?: object): void => {
    const logger = this.getActualLogger();
    logger.info(msg, context);
    // Note: OTEL emission is handled by the underlying logger (Pino or ConsoleLogger)
  };

  warn: LogFn = (msg: string, context?: object): void => {
    const logger = this.getActualLogger();
    logger.warn(msg, context);
    // Note: OTEL emission is handled by the underlying logger (Pino or ConsoleLogger)
  };

  error: LogFn = (msg: string, context?: object): void => {
    const logger = this.getActualLogger();
    logger.error(msg, context);
    // Note: OTEL emission is handled by the underlying logger (Pino or ConsoleLogger)
  };

  fatal: LogFn = (msg: string, context?: object): void => {
    const logger = this.getActualLogger();
    logger.fatal(msg, context);
    // Note: OTEL emission is handled by the underlying logger (Pino or ConsoleLogger)
  };

  /**
   * Create a child logger with additional bindings
   */
  child(childBindings: Record<string, any>): Logger {
    return new LoggerProxy({ ...this.bindings, ...childBindings }, this.externalLogger);
  }
}

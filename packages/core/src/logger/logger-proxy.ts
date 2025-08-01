import type { LogFn, Logger } from "@voltagent/internal";
import { BufferedLogger } from "./buffered-logger";
import { getGlobalLogger } from "./index";

/**
 * LoggerProxy implements the Logger interface but delegates all calls to the current global logger.
 * This allows agents and workflows to be created before VoltAgent sets the global logger,
 * while still using the correct logger once it's available.
 */
export class LoggerProxy implements Logger {
  private bindings: Record<string, any>;

  constructor(bindings: Record<string, any> = {}) {
    this.bindings = bindings;
  }

  /**
   * Get the actual logger instance with bindings applied
   */
  private getActualLogger(): Logger {
    const globalLogger = getGlobalLogger();
    const childLogger =
      Object.keys(this.bindings).length > 0 ? globalLogger.child(this.bindings) : globalLogger;

    // Always wrap with BufferedLogger to ensure all logs go to buffer
    // This is the single point where buffer management happens
    return new BufferedLogger(childLogger, this.bindings);
  }

  trace: LogFn = (msg: string, context?: object): void => {
    const logger = this.getActualLogger();
    logger.trace(msg, context);
  };

  debug: LogFn = (msg: string, context?: object): void => {
    const logger = this.getActualLogger();
    logger.debug(msg, context);
  };

  info: LogFn = (msg: string, context?: object): void => {
    const logger = this.getActualLogger();
    logger.info(msg, context);
  };

  warn: LogFn = (msg: string, context?: object): void => {
    const logger = this.getActualLogger();
    logger.warn(msg, context);
  };

  error: LogFn = (msg: string, context?: object): void => {
    const logger = this.getActualLogger();
    logger.error(msg, context);
  };

  fatal: LogFn = (msg: string, context?: object): void => {
    const logger = this.getActualLogger();
    logger.fatal(msg, context);
  };

  /**
   * Create a child logger with additional bindings
   */
  child(childBindings: Record<string, any>): Logger {
    return new LoggerProxy({ ...this.bindings, ...childBindings });
  }
}

import type { Logger, LogFn } from "@voltagent/internal";
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
    return Object.keys(this.bindings).length > 0 ? globalLogger.child(this.bindings) : globalLogger;
  }

  trace: LogFn = (...args: any[]): void => {
    const logger = this.getActualLogger();
    // @ts-ignore - LogFn overloads
    logger.trace(...args);
  };

  debug: LogFn = (...args: any[]): void => {
    const logger = this.getActualLogger();
    // @ts-ignore - LogFn overloads
    logger.debug(...args);
  };

  info: LogFn = (...args: any[]): void => {
    const logger = this.getActualLogger();
    // @ts-ignore - LogFn overloads
    logger.info(...args);
  };

  warn: LogFn = (...args: any[]): void => {
    const logger = this.getActualLogger();
    // @ts-ignore - LogFn overloads
    logger.warn(...args);
  };

  error: LogFn = (...args: any[]): void => {
    const logger = this.getActualLogger();
    // @ts-ignore - LogFn overloads
    logger.error(...args);
  };

  fatal: LogFn = (...args: any[]): void => {
    const logger = this.getActualLogger();
    // @ts-ignore - LogFn overloads
    logger.fatal(...args);
  };

  /**
   * Create a child logger with additional bindings
   */
  child(childBindings: Record<string, any>): Logger {
    return new LoggerProxy({ ...this.bindings, ...childBindings });
  }
}

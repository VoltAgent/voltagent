import { context, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
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

  /**
   * Check if a log level should be logged based on the configured level
   */
  private shouldLog(messageLevel: string): boolean {
    const logger = this.getActualLogger();

    // Try to get the level from the logger instance
    let configuredLevel: string | undefined;

    // Check for Pino instance
    if ((logger as any)._pinoInstance?.level) {
      configuredLevel = (logger as any)._pinoInstance.level;
    }
    // Check for ConsoleLogger or other logger with level property
    else if ((logger as any).level !== undefined) {
      configuredLevel = (logger as any).level;
    }

    // If we can't determine the level, allow the log (fail-open)
    if (!configuredLevel) {
      return true;
    }

    // Map log levels to numeric priorities
    const levels = ["trace", "debug", "info", "warn", "error", "fatal"];
    const configuredLevelIndex = levels.indexOf(configuredLevel.toLowerCase());
    const messageLevelIndex = levels.indexOf(messageLevel.toLowerCase());

    // If either level is not found, allow the log
    if (configuredLevelIndex === -1 || messageLevelIndex === -1) {
      return true;
    }

    // Only log if message level is >= configured level
    return messageLevelIndex >= configuredLevelIndex;
  }

  /**
   * Emit log via OpenTelemetry Logs API if available
   */
  private emitOtelLog(severity: string, msg: string, metadata?: object): void {
    // Check if OpenTelemetry LoggerProvider is available via globalThis
    const loggerProvider = (globalThis as any).___voltagent_otel_logger_provider;
    if (!loggerProvider) return;

    try {
      const otelLogger = logs.getLogger("voltagent", "1.0.0", {
        includeTraceContext: true,
      });

      // Map severity to OpenTelemetry severity number
      const severityMap: Record<string, number> = {
        trace: 1,
        debug: 5,
        info: 9,
        warn: 13,
        error: 17,
        fatal: 21,
      };

      const severityNumber = severityMap[severity] || 9;

      // Emit the log record
      const globalSpanGetter = (
        globalThis as typeof globalThis & {
          ___voltagent_get_active_span?: () => ReturnType<typeof trace.getActiveSpan>;
        }
      ).___voltagent_get_active_span;

      const activeSpan = trace.getActiveSpan() ?? globalSpanGetter?.();
      const activeContext = context.active();
      const logContext = activeSpan ? trace.setSpan(activeContext, activeSpan) : activeContext;

      otelLogger.emit({
        severityNumber,
        severityText: severity.toUpperCase(),
        body: msg,
        attributes: {
          ...this.bindings,
          ...metadata,
        },
        context: logContext,
      });
    } catch {
      // Silently ignore errors in OpenTelemetry emission
    }
  }

  trace: LogFn = (msg: string, context?: object): void => {
    // Always emit to OpenTelemetry regardless of configured level
    this.emitOtelLog("trace", msg, context);

    // Only log to console/stdout if level check passes
    if (!this.shouldLog("trace")) return;
    const logger = this.getActualLogger();
    logger.trace(msg, context);
  };

  debug: LogFn = (msg: string, context?: object): void => {
    // Always emit to OpenTelemetry regardless of configured level
    this.emitOtelLog("debug", msg, context);

    // Only log to console/stdout if level check passes
    if (!this.shouldLog("debug")) return;
    const logger = this.getActualLogger();
    logger.debug(msg, context);
  };

  info: LogFn = (msg: string, context?: object): void => {
    // Always emit to OpenTelemetry regardless of configured level
    this.emitOtelLog("info", msg, context);

    // Only log to console/stdout if level check passes
    if (!this.shouldLog("info")) return;
    const logger = this.getActualLogger();
    logger.info(msg, context);
  };

  warn: LogFn = (msg: string, context?: object): void => {
    // Always emit to OpenTelemetry regardless of configured level
    this.emitOtelLog("warn", msg, context);

    // Only log to console/stdout if level check passes
    if (!this.shouldLog("warn")) return;
    const logger = this.getActualLogger();
    logger.warn(msg, context);
  };

  error: LogFn = (msg: string, context?: object): void => {
    // Always emit to OpenTelemetry regardless of configured level
    this.emitOtelLog("error", msg, context);

    // Only log to console/stdout if level check passes
    if (!this.shouldLog("error")) return;
    const logger = this.getActualLogger();
    logger.error(msg, context);
  };

  fatal: LogFn = (msg: string, context?: object): void => {
    // Always emit to OpenTelemetry regardless of configured level
    this.emitOtelLog("fatal", msg, context);

    // Only log to console/stdout if level check passes
    if (!this.shouldLog("fatal")) return;
    const logger = this.getActualLogger();
    logger.fatal(msg, context);
  };

  /**
   * Create a child logger with additional bindings
   */
  child(childBindings: Record<string, any>): Logger {
    return new LoggerProxy({ ...this.bindings, ...childBindings }, this.externalLogger);
  }
}

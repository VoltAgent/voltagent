import type { Logger, LogFn } from "@voltagent/internal";
import { LoggerProxy } from "./logger-proxy";

/**
 * ForwardingLoggerProxy forwards all log messages to multiple loggers.
 * This is used to propagate sub-agent logs to their parent agents.
 */
export class ForwardingLoggerProxy implements Logger {
  private primaryLogger: Logger;
  private forwardToLoggers: Logger[];
  private parentHistoryEntryId?: string;

  constructor(primaryLogger: Logger, forwardToLoggers: Logger[], parentHistoryEntryId?: string) {
    this.primaryLogger = primaryLogger;
    this.forwardToLoggers = forwardToLoggers;
    this.parentHistoryEntryId = parentHistoryEntryId;
  }

  /**
   * Forward a log message to all loggers
   */
  private forwardLog(level: keyof Logger, msg: string, context?: object): void {
    // Log to primary logger first
    (this.primaryLogger[level] as LogFn)(msg, context);

    // Then forward to all other loggers
    for (const logger of this.forwardToLoggers) {
      // Add forwarding context to distinguish forwarded logs
      const forwardedContext = {
        ...context,
        forwarded: true,
        forwardedFrom: (this.primaryLogger as any).bindings?.agentId || "unknown",
        // Add parent's executionId/historyId if available so sub-agent logs appear in parent's filter
        ...(this.parentHistoryEntryId && {
          parentExecutionId: this.parentHistoryEntryId,
          parentHistoryId: this.parentHistoryEntryId,
        }),
      };
      (logger[level] as LogFn)(`[Sub-Agent] ${msg}`, forwardedContext);
    }
  }

  trace: LogFn = (msg: string, context?: object): void => {
    this.forwardLog("trace", msg, context);
  };

  debug: LogFn = (msg: string, context?: object): void => {
    this.forwardLog("debug", msg, context);
  };

  info: LogFn = (msg: string, context?: object): void => {
    this.forwardLog("info", msg, context);
  };

  warn: LogFn = (msg: string, context?: object): void => {
    this.forwardLog("warn", msg, context);
  };

  error: LogFn = (msg: string, context?: object): void => {
    this.forwardLog("error", msg, context);
  };

  fatal: LogFn = (msg: string, context?: object): void => {
    this.forwardLog("fatal", msg, context);
  };

  /**
   * Create a child logger that also forwards
   */
  child(childBindings: Record<string, any>): Logger {
    const childPrimary = this.primaryLogger.child(childBindings);
    const childForwardTo = this.forwardToLoggers.map((logger) => logger.child(childBindings));
    return new ForwardingLoggerProxy(childPrimary, childForwardTo, this.parentHistoryEntryId);
  }
}

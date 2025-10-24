/**
 * Default console logger implementation
 * Used when @voltagent/logger is not available
 */

import { context, trace } from "@opentelemetry/api";
import type { LogBuffer, LogEntry, LogFilter, LogFn, Logger } from "@voltagent/internal";
import { safeStringify } from "@voltagent/internal/utils";
import { getEnvVar } from "../utils/runtime";
import { SimpleEventEmitter } from "../utils/simple-event-emitter";

/**
 * Simple console logger that implements the Logger interface
 */
export class ConsoleLogger implements Logger {
  private context: Record<string, any>;
  public level: string;

  constructor(context: Record<string, any> = {}, level = "info") {
    this.context = context;
    this.level = level;
  }

  private shouldLog(level: string): boolean {
    const levels = ["trace", "debug", "info", "warn", "error", "fatal"];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: string, msg: string, obj?: object): string {
    const timestamp = new Date().toISOString();
    const contextStr =
      Object.keys(this.context).length > 0 ? ` ${safeStringify(this.context)}` : "";
    const objStr = obj ? ` ${safeStringify(obj)}` : "";
    return `[${timestamp}] ${level.toUpperCase()}${contextStr}: ${msg}${objStr}`;
  }

  private emitOtelLog(level: string, msg: string, obj?: object): void {
    // Check if OpenTelemetry LoggerProvider is available via globalThis
    const loggerProvider = (globalThis as any).___voltagent_otel_logger_provider;
    if (!loggerProvider) {
      return;
    }

    try {
      const otelLogger = loggerProvider.getLogger("voltagent-console", "1.0.0", {
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

      const severityNumber = severityMap[level] || 9;

      // Emit the log record while preserving the current context so trace/span ids propagate
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
        severityText: level.toUpperCase(),
        body: msg,
        attributes: {
          ...this.context,
          ...obj,
        },
        context: logContext,
      });
    } catch (error) {
      console.error("[ConsoleLogger] Failed to emit OTEL log", error);
    }
  }

  private createLogFn(level: string, consoleFn: (...args: any[]) => void): LogFn {
    return (msgOrObj: string | object, ...args: any[]): void => {
      let msg: string;
      let obj: object | undefined;

      if (typeof msgOrObj === "string") {
        msg = msgOrObj;
        obj = args[0];
      } else {
        msg = args[0] || "";
        obj = msgOrObj;
      }

      // Always emit to OpenTelemetry regardless of configured level
      // This ensures observability platforms receive all logs
      this.emitOtelLog(level, msg, obj);

      // Only log to console if level check passes
      // This keeps local development output clean
      if (this.shouldLog(level)) {
        consoleFn(this.formatMessage(level, msg, obj));
      }
    };
  }

  trace: LogFn = this.createLogFn("trace", console.debug);
  debug: LogFn = this.createLogFn("debug", console.debug);
  info: LogFn = this.createLogFn("info", console.info);
  warn: LogFn = this.createLogFn("warn", console.warn);
  error: LogFn = this.createLogFn("error", console.error);
  fatal: LogFn = this.createLogFn("fatal", console.error);

  child(bindings: Record<string, any>): Logger {
    return new ConsoleLogger({ ...this.context, ...bindings }, this.level);
  }
}

/**
 * Create a default console logger
 */
export function createConsoleLogger(options: { name?: string; level?: string } = {}): Logger {
  const context: Record<string, any> = {};
  if (options.name) {
    context.component = options.name;
  }
  const resolvedLevel =
    options.level ||
    getEnvVar("VOLTAGENT_LOG_LEVEL") ||
    getEnvVar("LOG_LEVEL") ||
    (getEnvVar("NODE_ENV") === "production" ? "error" : "info");

  return new ConsoleLogger(context, resolvedLevel);
}

/**
 * Simple in-memory log buffer implementation with event emitter
 */
export class InMemoryLogBuffer extends SimpleEventEmitter implements LogBuffer {
  private logs: LogEntry[] = [];
  private maxSize: number;

  constructor(maxSize = 1000) {
    super();
    this.maxSize = maxSize;
  }

  add(entry: LogEntry): void {
    this.logs.push(entry);
    // Keep only the last maxSize entries
    if (this.logs.length > this.maxSize) {
      this.logs = this.logs.slice(-this.maxSize);
    }
    // Emit event for new log
    this.emit("log-added", entry);
  }

  query(filter?: LogFilter): LogEntry[] {
    if (!filter) {
      return [...this.logs];
    }

    const results = this.logs
      .filter((log) => {
        // Filter by level - show logs at this level and higher severity
        if (filter.level) {
          const filterLevelPriority = this.getLevelPriority(filter.level);
          const logLevelPriority = this.getLevelPriority(log.level);
          if (logLevelPriority < filterLevelPriority) return false;
        }
        if (filter.agentId && log.agentId !== filter.agentId) return false;
        if (filter.conversationId && log.conversationId !== filter.conversationId) return false;
        if (filter.workflowId && log.workflowId !== filter.workflowId) return false;
        if (
          filter.executionId &&
          log.executionId !== filter.executionId &&
          log.parentExecutionId !== filter.executionId
        )
          return false;
        if (filter.since && new Date(log.timestamp) < filter.since) return false;
        if (filter.until && new Date(log.timestamp) > filter.until) return false;
        return true;
      })
      .slice(0, filter.limit || 100);

    return results;
  }

  clear(): void {
    this.logs = [];
  }

  private getLevelPriority(level: string): number {
    const priorities: Record<string, number> = {
      trace: 10,
      debug: 20,
      info: 30,
      warn: 40,
      error: 50,
      fatal: 60,
    };

    return priorities[level.toLowerCase()] || 0;
  }

  size(): number {
    return this.logs.length;
  }
}

// Global log buffer instance
let globalLogBuffer: InMemoryLogBuffer | null = null;

/**
 * Get the global log buffer
 */
export function getDefaultLogBuffer(): LogBuffer {
  if (!globalLogBuffer) {
    globalLogBuffer = new InMemoryLogBuffer();
  }
  return globalLogBuffer;
}

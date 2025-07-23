/**
 * Default console logger implementation
 * Used when @voltagent/logger is not available
 */

import type { Logger, LogFn, LogBuffer, LogEntry, LogFilter } from "@voltagent/internal";
import { EventEmitter } from "events";

/**
 * Simple console logger that implements the Logger interface
 */
export class ConsoleLogger implements Logger {
  private context: Record<string, any>;
  private level: string;

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
      Object.keys(this.context).length > 0 ? ` ${JSON.stringify(this.context)}` : "";
    const objStr = obj ? ` ${JSON.stringify(obj)}` : "";
    return `[${timestamp}] ${level.toUpperCase()}${contextStr}: ${msg}${objStr}`;
  }

  private createLogFn(level: string, consoleFn: (...args: any[]) => void): LogFn {
    return (msgOrObj: string | object, ...args: any[]): void => {
      if (!this.shouldLog(level)) return;

      if (typeof msgOrObj === "string") {
        consoleFn(this.formatMessage(level, msgOrObj, args[0]));
      } else {
        const msg = args[0] || "";
        consoleFn(this.formatMessage(level, msg, msgOrObj));
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
  return new ConsoleLogger(context, options.level || process.env.LOG_LEVEL || "info");
}

/**
 * Simple in-memory log buffer implementation with event emitter
 */
export class InMemoryLogBuffer extends EventEmitter implements LogBuffer {
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
        if (filter.level && log.level.toLowerCase() !== filter.level.toLowerCase()) return false;
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

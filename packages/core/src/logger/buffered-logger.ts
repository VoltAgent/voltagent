import type { LogBuffer, LogEntry, LogFn, LogLevel, Logger } from "@voltagent/internal";
import { getDefaultLogBuffer } from "./console-logger";

/**
 * A logger wrapper that automatically syncs all logs to the global buffer
 * This ensures logs appear in API/logs and VoltOps console regardless of logger source
 */
export class BufferedLogger implements Logger {
  private logger: Logger;
  private buffer: LogBuffer;
  private context: Record<string, any>;

  constructor(logger: Logger, context: Record<string, any> = {}) {
    this.logger = logger;
    this.buffer = getDefaultLogBuffer();
    this.context = context;
  }

  private addToBuffer(level: string, msg: string, obj?: object): void {
    // Serialize error objects properly
    const serializedObj = obj ? this.serializeErrors(obj) : {};

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: level as LogLevel,
      msg,
      ...this.context,
      ...serializedObj,
    };
    this.buffer.add(entry);
  }

  private serializeErrors(obj: any): any {
    if (obj instanceof Error) {
      // Get all properties including non-enumerable ones
      const errorObj: any = {
        type: obj.constructor.name,
        message: obj.message,
        stack: obj.stack,
      };

      // Copy any additional enumerable properties
      Object.keys(obj).forEach((key) => {
        if (key !== "message" && key !== "stack") {
          errorObj[key] = (obj as any)[key];
        }
      });

      return errorObj;
    }

    if (typeof obj === "object" && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value instanceof Error) {
          // Get all properties including non-enumerable ones
          const errorObj: any = {
            type: value.constructor.name,
            message: value.message,
            stack: value.stack,
          };

          // Copy any additional enumerable properties
          Object.keys(value).forEach((k) => {
            if (k !== "message" && k !== "stack") {
              errorObj[k] = (value as any)[k];
            }
          });

          result[key] = errorObj;
        } else if (typeof value === "object" && value !== null) {
          result[key] = this.serializeErrors(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    }

    return obj;
  }

  private createLogFn(level: string): LogFn {
    return (msgOrObj: string | object, ...args: any[]): void => {
      // FIRST: Always add to buffer (regardless of underlying logger's level)
      if (typeof msgOrObj === "string") {
        this.addToBuffer(level, msgOrObj, args[0]);
      } else {
        const msg = args[0] || "";
        this.addToBuffer(level, msg, msgOrObj);
      }

      // THEN: Call the underlying logger (respects its log level for terminal output)
      (this.logger as any)[level](msgOrObj, ...args);
    };
  }

  trace: LogFn = this.createLogFn("trace");
  debug: LogFn = this.createLogFn("debug");
  info: LogFn = this.createLogFn("info");
  warn: LogFn = this.createLogFn("warn");
  error: LogFn = this.createLogFn("error");
  fatal: LogFn = this.createLogFn("fatal");

  child(bindings: Record<string, any>): Logger {
    return new BufferedLogger(this.logger.child(bindings), { ...this.context, ...bindings });
  }
}

/**
 * Wrap a logger to ensure it syncs to the global buffer
 */
export function ensureBufferedLogger(logger: Logger, context: Record<string, any> = {}): Logger {
  // If it's already a BufferedLogger, just return it
  if (logger instanceof BufferedLogger) {
    return logger;
  }
  return new BufferedLogger(logger, context);
}

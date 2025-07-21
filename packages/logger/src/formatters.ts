import type { LoggerOptions } from "pino";
import type { LoggerOptions as VoltLoggerOptions } from "./types";

/**
 * Get the default log level based on environment
 */
export function getDefaultLogLevel(): string {
  const envLevel = process.env.VOLTAGENT_LOG_LEVEL || process.env.LOG_LEVEL;
  if (envLevel) {
    return envLevel.toLowerCase();
  }

  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

/**
 * Get the default log format based on environment
 */
export function getDefaultLogFormat(): "json" | "pretty" {
  const envFormat = process.env.VOLTAGENT_LOG_FORMAT;
  if (envFormat === "json" || envFormat === "pretty") {
    return envFormat;
  }

  return process.env.NODE_ENV === "production" ? "json" : "pretty";
}

/**
 * Get default redaction paths
 */
export function getDefaultRedactionPaths(): string[] {
  const defaultPaths = ["password", "token", "apiKey", "secret", "authorization", "cookie"];
  const envRedact = process.env.VOLTAGENT_LOG_REDACT;

  if (envRedact) {
    const customPaths = envRedact.split(",").map((p) => p.trim());
    return [...new Set([...defaultPaths, ...customPaths])];
  }

  return defaultPaths;
}

/**
 * Create Pino logger options from VoltAgent logger options
 */
export function createPinoOptions(options: VoltLoggerOptions = {}): LoggerOptions {
  const format = options.format || getDefaultLogFormat();
  const pretty = options.pretty ?? process.env.NODE_ENV !== "production";
  const shouldUsePretty = format === "pretty" && pretty;

  const pinoOptions: LoggerOptions = {
    level: options.level || getDefaultLogLevel(),
    name: options.name,
    redact: {
      paths: options.redact || getDefaultRedactionPaths(),
      censor: "[REDACTED]",
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
      const offset = -now.getTimezoneOffset();
      const offsetHours = Math.floor(Math.abs(offset) / 60);
      const offsetMinutes = Math.abs(offset) % 60;
      const offsetSign = offset >= 0 ? "+" : "-";
      const offsetString = `${offsetSign}${offsetHours.toString().padStart(2, "0")}${offsetMinutes.toString().padStart(2, "0")}`;
      return `,"timestamp":"${now.toISOString().replace("Z", "")} ${offsetString}"`;
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
          "[{component}] {msg}{if userId} | user={userId}{end}{if conversationId} conv={conversationId}{end}{if agentId} agent={agentId}{end}{if toolName} tool={toolName}{end}",
        errorLikeObjectKeys: ["err", "error", "exception"],
        errorProps: "",
        singleLine: !["debug", "trace"].includes(options.level || getDefaultLogLevel()),
        messageKey: "msg",
      },
    };
  }

  // Copy over any other Pino options
  const { format: _, pretty: __, redact: ___, bufferSize: ____, ...restOptions } = options;

  return {
    ...pinoOptions,
    ...restOptions,
  };
}

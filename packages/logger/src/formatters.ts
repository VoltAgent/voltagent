// Generic formatting utilities for logger providers

/**
 * Get the default log level based on environment
 */
export function getDefaultLogLevel(): string {
  const envLevel = process.env.VOLTAGENT_LOG_LEVEL || process.env.LOG_LEVEL;
  if (envLevel) {
    return envLevel.toLowerCase();
  }

  return process.env.NODE_ENV === "production" ? "error" : "info";
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

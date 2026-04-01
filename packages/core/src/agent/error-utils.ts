import { safeStringify } from "@voltagent/internal/utils";

/**
 * Convert a tool execution error into a serializable payload returned to the model.
 */
export function buildToolErrorResult(error: Error, toolCallId: string, toolName: string) {
  const errorResult: Record<string, unknown> = {
    error: true,
    name: error.name,
    message: error.message,
    stack: error.stack,
    toolCallId,
    toolName,
  };

  const cause = (error as { cause?: unknown }).cause;
  if (cause !== undefined) {
    errorResult.cause =
      cause instanceof Error
        ? {
            name: cause.name,
            message: cause.message,
            stack: cause.stack,
          }
        : sanitizeErrorValue(cause);
  }

  for (const key of Object.getOwnPropertyNames(error)) {
    if (["name", "message", "stack", "cause", "error"].includes(key)) {
      continue;
    }

    const value = (error as unknown as Record<string, unknown>)[key];
    if (value === undefined || typeof value === "function") {
      continue;
    }

    errorResult[key] = sanitizeErrorValue(value);
  }

  return errorResult;
}

/**
 * Make arbitrary error values JSON-safe, handling circular structures by stringifying.
 */
export function sanitizeErrorValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeErrorValue(item));
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Map || value instanceof Set) {
    return safeStringify(value);
  }

  try {
    return safeStringify(value);
  } catch {
    return String(value);
  }
}

import type { Logger } from "../logger";

function readObjectProperty(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object") return undefined;
  return (value as Record<string, unknown>)[key];
}

export function coerceStatus(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function extractStatusCode(error: unknown, logger?: Logger): number | undefined {
  const status =
    coerceStatus(readObjectProperty(error, "status")) ??
    coerceStatus(readObjectProperty(error, "statusCode")) ??
    coerceStatus(readObjectProperty(error, "httpStatus")) ??
    coerceStatus(readObjectProperty(readObjectProperty(error, "response"), "status")) ??
    coerceStatus(readObjectProperty(readObjectProperty(error, "cause"), "status"));

  logger?.trace?.("Extracted status code", {
    status,
    hasStatus: readObjectProperty(error, "status") !== undefined,
    hasStatusCode: readObjectProperty(error, "statusCode") !== undefined,
    hasHttpStatus: readObjectProperty(error, "httpStatus") !== undefined,
    hasResponseStatus:
      readObjectProperty(readObjectProperty(error, "response"), "status") !== undefined,
    hasCauseStatus: readObjectProperty(readObjectProperty(error, "cause"), "status") !== undefined,
  });

  return status;
}

export function isTimeoutError(error: unknown, logger?: Logger): boolean {
  const code = readObjectProperty(error, "code");
  const name = readObjectProperty(error, "name");
  const message = readObjectProperty(error, "message");
  const isTimeout =
    String(code ?? "")
      .toLowerCase()
      .includes("timeout") ||
    String(name ?? "")
      .toLowerCase()
      .includes("timeout") ||
    String(message ?? "")
      .toLowerCase()
      .includes("timeout");

  logger?.trace?.("Checked timeout error", {
    isTimeout,
    code,
    name,
    messagePreview: typeof message === "string" ? message.slice(0, 160) : message,
  });

  return isTimeout;
}

export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return !!value && typeof (value as { then?: unknown }).then === "function";
}

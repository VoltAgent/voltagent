import type { Logger } from "../logger";

function readObjectProperty(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object") return undefined;
  return (value as Record<string, unknown>)[key];
}

export function findHeaders(value: unknown): unknown[] {
  const candidates: unknown[] = [
    readObjectProperty(value, "headers"),
    readObjectProperty(readObjectProperty(value, "response"), "headers"),
    readObjectProperty(readObjectProperty(value, "cause"), "headers"),
    readObjectProperty(
      readObjectProperty(readObjectProperty(value, "cause"), "response"),
      "headers",
    ),
  ];

  return candidates.filter((candidate) => candidate !== undefined && candidate !== null);
}

export function readHeaderValue(headers: unknown, name: string): string | undefined {
  if (!headers) return undefined;

  if (typeof (headers as { get?: unknown }).get === "function") {
    const v = (headers as { get: (name: string) => unknown }).get(name);
    return v === null || v === undefined ? undefined : String(v);
  }

  if (typeof headers !== "object") return undefined;

  const entries = Object.entries(headers as Record<string, unknown>);
  const target = name.toLowerCase();
  const match = entries.find(([k]) => String(k).toLowerCase() === target);
  if (!match) return undefined;

  const value = match[1];
  if (Array.isArray(value)) {
    const first = value[0];
    return first === null || first === undefined ? undefined : String(first);
  }
  return value === null || value === undefined ? undefined : String(value);
}

export function parseRetryAfterMs(value: string, nowMs: number = Date.now()): number | undefined {
  const raw = value.trim();
  if (!raw) return undefined;

  const seconds = Number(raw);
  if (Number.isFinite(seconds)) {
    return Math.max(0, Math.round(seconds * 1000));
  }

  const parsedAt = Date.parse(raw);
  if (Number.isFinite(parsedAt)) {
    return Math.max(0, parsedAt - nowMs);
  }

  return undefined;
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

export function extractRetryAfterMs(error: unknown, logger?: Logger): number | undefined {
  const retryAfterLogger = logger?.child({ module: "retry-after" });
  const candidates = findHeaders(error);

  for (const headers of candidates) {
    const raw = readHeaderValue(headers, "retry-after");
    if (!raw) continue;
    const parsed = parseRetryAfterMs(raw);
    retryAfterLogger?.trace?.("Parsed Retry-After header", { raw, parsedMs: parsed });
    if (parsed !== undefined) return parsed;
  }

  retryAfterLogger?.trace?.("Retry-After header missing or unparsable");
  return undefined;
}

export function isTimeoutError(error: unknown, logger?: Logger): boolean {
  const candidates: unknown[] = [error];

  const cause = readObjectProperty(error, "cause");
  if (cause) {
    candidates.push(cause);
    const nestedCause = readObjectProperty(cause, "cause");
    if (nestedCause) candidates.push(nestedCause);
  }

  for (const candidate of candidates) {
    const code = readObjectProperty(candidate, "code");
    const name = readObjectProperty(candidate, "name");
    const message = readObjectProperty(candidate, "message");

    const codeText = String(code ?? "").toLowerCase();
    const nameText = String(name ?? "").toLowerCase();
    const messageText = String(message ?? "").toLowerCase();

    const isTimeout =
      codeText.includes("timeout") ||
      codeText.includes("timedout") ||
      nameText.includes("timeout") ||
      nameText.includes("timedout") ||
      messageText.includes("timeout") ||
      messageText.includes("timedout") ||
      messageText.includes("timed out");

    logger?.trace?.("Checked timeout error", {
      isTimeout,
      code,
      name,
      messagePreview: typeof message === "string" ? message.slice(0, 160) : message,
      hasCause: candidate !== error,
    });

    if (isTimeout) return true;
  }

  return false;
}

export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return !!value && typeof (value as { then?: unknown }).then === "function";
}

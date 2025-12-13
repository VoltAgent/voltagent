function readObjectProperty(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object") return undefined;
  return (value as Record<string, unknown>)[key];
}

export function coerceStatus(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function extractStatusCode(error: unknown): number | undefined {
  return (
    coerceStatus(readObjectProperty(error, "status")) ??
    coerceStatus(readObjectProperty(error, "statusCode")) ??
    coerceStatus(readObjectProperty(error, "httpStatus")) ??
    coerceStatus(readObjectProperty(readObjectProperty(error, "response"), "status")) ??
    coerceStatus(readObjectProperty(readObjectProperty(error, "cause"), "status"))
  );
}

export function isTimeoutError(error: unknown): boolean {
  const code = readObjectProperty(error, "code");
  const name = readObjectProperty(error, "name");
  const message = readObjectProperty(error, "message");
  return (
    String(code ?? "")
      .toLowerCase()
      .includes("timeout") ||
    String(name ?? "")
      .toLowerCase()
      .includes("timeout") ||
    String(message ?? "")
      .toLowerCase()
      .includes("timeout")
  );
}

export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return !!value && typeof (value as { then?: unknown }).then === "function";
}

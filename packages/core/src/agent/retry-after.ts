/**
 * Cap how long we'll honor a server-supplied `Retry-After` header.
 * A misconfigured or hostile server can otherwise pin an agent for hours.
 */
const MAX_RETRY_AFTER_MS = 5 * 60 * 1000;

/**
 * Parse an HTTP `Retry-After` header value (RFC 7231 §7.1.3) into milliseconds.
 *
 * Accepts the two RFC-defined forms:
 *   - delta-seconds: a non-negative integer (e.g. `Retry-After: 120`)
 *   - HTTP-date:     a fixed-form HTTP date (e.g. `Retry-After: Fri, 31 Dec 1999 23:59:59 GMT`)
 *
 * Returns `null` when the value is absent, empty, malformed, or negative.
 * The result is clamped to {@link MAX_RETRY_AFTER_MS}.
 *
 * @param value     The raw header value, or `undefined`/`null` when absent.
 * @param nowMs     Current time in milliseconds, injected for tests. Defaults to `Date.now()`.
 */
export function parseRetryAfter(
  value: string | undefined | null,
  nowMs: number = Date.now(),
): number | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }

  if (/^\d+$/.test(trimmed)) {
    const seconds = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(seconds) || seconds < 0) {
      return null;
    }
    return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  }

  // HTTP-date form mandates a day-name and month-name (RFC 7231 §7.1.1.1),
  // so an HTTP-date always contains ASCII letters. Reject numeric-looking
  // values like "1.5", "10ms", or "-5" before falling into `Date.parse`,
  // which is permissive enough to coerce some of them into past dates.
  if (!/[A-Za-z]/.test(trimmed)) {
    return null;
  }

  const dateMs = Date.parse(trimmed);
  if (Number.isNaN(dateMs)) {
    return null;
  }

  const delta = dateMs - nowMs;
  if (delta <= 0) {
    return 0;
  }
  return Math.min(delta, MAX_RETRY_AFTER_MS);
}

/**
 * Read the `Retry-After` header off an error's `responseHeaders` bag and return
 * its parsed value in milliseconds, or `null` when absent.
 *
 * AI SDK populates `responseHeaders` on `APICallError` and similar provider errors
 * with lowercased header names. Both lowercase and canonical-case forms are
 * accepted to stay robust against providers that don't normalize.
 */
export function getRetryAfterMs(error: unknown, nowMs: number = Date.now()): number | null {
  const headers = (error as { responseHeaders?: Record<string, string> } | undefined)
    ?.responseHeaders;
  if (!headers || typeof headers !== "object") {
    return null;
  }
  const raw = headers["retry-after"] ?? headers["Retry-After"];
  return parseRetryAfter(raw, nowMs);
}

/**
 * Compute the wait between two retry attempts.
 *
 * When the provider supplies a `Retry-After` header (typical on 429 and 503),
 * use it as the floor — the server has just told us the earliest moment it's
 * willing to serve another request, and ignoring that signal causes
 * coordinated retry-storms across concurrent agents.
 *
 * In every case we keep the exponential floor as a backpressure baseline so a
 * `Retry-After: 0` (or an absent header on transient errors) still spaces
 * subsequent attempts out.
 *
 * @param error          The error thrown by the model invocation.
 * @param attemptIndex   Zero-based retry attempt index.
 * @param nowMs          Current time in ms, injected for tests.
 */
export function computeRetryDelayMs(
  error: unknown,
  attemptIndex: number,
  nowMs: number = Date.now(),
): number {
  const exponentialMs = Math.min(1000 * 2 ** attemptIndex, 10000);
  const serverHintMs = getRetryAfterMs(error, nowMs);
  if (serverHintMs == null) {
    return exponentialMs;
  }
  return Math.max(serverHintMs, exponentialMs);
}

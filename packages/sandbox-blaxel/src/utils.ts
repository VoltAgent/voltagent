/**
 * Coerce an unknown value into an `Error` instance. If `value` is already an
 * `Error`, returns it unchanged; otherwise wraps its string form in a new
 * `Error`. Useful for normalizing thrown values from APIs that don't guarantee
 * `Error` instances (e.g. `attempt` / `attemptAsync` tuples typed as `unknown`).
 */
export function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

interface WithEventListenerOptions<T> {
  target: EventTarget;
  event: string;
  listener: Parameters<EventTarget["addEventListener"]>[1];
  options?: Parameters<EventTarget["addEventListener"]>[2];
  run: () => Promise<T>;
}

/**
 * Bracket-style event-listener scope: attaches `listener` to `target` for
 * `event`, runs `run`, always detaches the listener — even if `run` throws.
 * Returns whatever `run` resolves to.
 */
export async function withEventListener<T>({
  target,
  event,
  listener,
  options,
  run,
}: WithEventListenerOptions<T>): Promise<T> {
  target.addEventListener(event, listener, options);
  try {
    return await run();
  } finally {
    target.removeEventListener(event, listener, options);
  }
}

/**
 * Truncate a UTF-8 string to at most `maxBytes` bytes (not characters).
 * A trailing partial multi-byte sequence may render as a replacement character.
 */
export function truncateOutput(
  value: string,
  maxBytes: number,
): { content: string; truncated: boolean } {
  if (value.length === 0) {
    return { content: "", truncated: false };
  }
  if (maxBytes <= 0) {
    return { content: "", truncated: true };
  }
  // Avoid allocating a Buffer when input fits.
  if (Buffer.byteLength(value, "utf-8") <= maxBytes) {
    return { content: value, truncated: false };
  }
  const data = Buffer.from(value, "utf-8");
  return { content: data.subarray(0, maxBytes).toString("utf-8"), truncated: true };
}

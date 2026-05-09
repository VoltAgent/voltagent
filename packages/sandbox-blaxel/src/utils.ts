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
 * Truncate a UTF-8 string to at most `maxBytes` bytes. The cut point is walked
 * back to the nearest codepoint boundary so the result is always valid UTF-8
 * (and its byte length is always `<= maxBytes`, never more).
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
  // UTF-8 continuation bytes match `0b10xxxxxx` (`byte & 0xc0 === 0x80`). Walk
  // the cut point back over them so we never slice mid-codepoint.
  let end = maxBytes;
  while (end > 0 && (data[end] & 0xc0) === 0x80) {
    end--;
  }
  return { content: data.subarray(0, end).toString("utf-8"), truncated: true };
}

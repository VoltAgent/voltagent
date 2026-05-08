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

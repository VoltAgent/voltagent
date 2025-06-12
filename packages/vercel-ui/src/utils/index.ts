import { createIdGenerator } from "ai";

/**
 * Generate a message ID, this mirrors the underlying implementation of `messageId` in `streamText`,
 * in the Vercel AI SDK `ai` package.
 * @returns The message ID.
 */
export const generateMessageId = createIdGenerator({
  prefix: "msg",
  separator: "-",
  size: 24,
});

/**
 * Generate a tool call ID, this mirrors the underlying implementation of `toolCallId` in `streamText`,
 * in the Vercel AI SDK `ai` package.
 * @returns The tool call ID.
 */
export const generateToolCallId = createIdGenerator({
  prefix: "call",
  separator: "_",
  size: 24,
});

/**
 * Check if an object has a key
 *
 * TODO: Move to @voltagent/internal package
 *
 * @param value - The object to check
 * @param key - The key to check for
 * @returns True if the object has the key, false otherwise
 */
export function hasKey<T, K extends string>(value: T, key: K): value is T & Record<K, unknown> {
  if (typeof value === "object" && value !== null && Array.isArray(value) === false) {
    return key in value;
  }

  return false;
}

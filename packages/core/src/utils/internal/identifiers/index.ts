import { createIdGenerator } from "ai";

/**
 * Generate a message ID, this mirrors the underlying implementation of `messageId` in `streamText`,
 * in the vercel `ai` package.
 * @returns The message ID.
 */
export const generateMessageId = createIdGenerator({
  prefix: "msg",
  separator: "_",
  size: 24,
});

/**
 * Generate a tool call ID, this mirrors the underlying implementation of `toolCallId` in `streamText`,
 * in the vercel `ai` package.
 * @returns The tool call ID.
 */
export const generateToolCallId = createIdGenerator({
  prefix: "tool-call",
  separator: "_",
  size: 24,
});

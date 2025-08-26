export { toUIMessageStream } from "./to-ui-message-stream";
export type { StreamCallbacks } from "./stream-callbacks";

import type { StreamPart } from "@voltagent/core";
// Re-export convenience function for creating responses
import { createUIMessageStreamResponse } from "ai";
import { toUIMessageStream } from "./to-ui-message-stream";

/**
 * Convenience function to convert VoltAgent stream directly to HTTP Response
 *
 * @example
 * ```typescript
 * import { toDataStreamResponse } from '@voltagent/vercel-ui';
 *
 * const result = await agent.streamText(prompt);
 * return toDataStreamResponse(result.fullStream);
 * ```
 */
export function toDataStreamResponse(
  stream: AsyncIterable<StreamPart>,
  options?: {
    headers?: HeadersInit;
    status?: number;
    statusText?: string;
  },
) {
  const uiStream = toUIMessageStream(stream);

  return createUIMessageStreamResponse({
    stream: uiStream,
    headers: options?.headers,
    status: options?.status,
    statusText: options?.statusText,
  });
}

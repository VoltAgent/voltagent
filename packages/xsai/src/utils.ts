import { StreamPart } from "@voltagent/core";
import type { StreamTextEvent } from "xsai";
import { P, match } from "ts-pattern";

/**
 * Map xsAI StreamTextEvent to our standard StreamPart
 * @param part - The part to map
 * @returns The mapped part or null if the part is not supported
 */
export function mapToStreamPart(part: StreamTextEvent): StreamPart | null {
  return (
    match(part)
      .returnType<StreamPart | null>()
      .with({ type: "text-delta" }, (p) => ({
        type: "text-delta",
        textDelta: p.text,
      }))
      // TODO: reasoning, source
      .with({ type: "tool-call" }, (p) => ({
        type: "tool-call",
        toolCallId: p.toolCallId,
        toolName: p.toolName,
        args: JSON.parse(p.args),
      }))
      .with({ type: "tool-result" }, (p) => ({
        type: "tool-result",
        toolCallId: p.toolCallId,
        toolName: p.toolName,
        result: p.result,
      }))
      .with({ type: "finish" }, (p) => ({
        type: "finish",
        finishReason: p.finishReason,
        usage: match(p)
          .with(
            {
              usage: {
                prompt_tokens: P.number,
                completion_tokens: P.number,
                total_tokens: P.number,
              },
            },
            (p) => ({
              promptTokens: p.usage.prompt_tokens,
              completionTokens: p.usage.completion_tokens,
              totalTokens: p.usage.total_tokens,
            }),
          )
          .otherwise(() => undefined),
      }))
      .with({ type: "error" }, (p) => ({
        type: "error",
        error: p.error as Error,
      }))
      .otherwise(() => null)
  );
}

/**
 * Create mapped fullStream that converts xsAI parts to our standard parts
 * @param originalStream - The original stream of parts from the xsAI SDK
 * @returns A new stream of parts that are converted to our standard parts
 */
export function createMappedFullStream(
  originalStream: AsyncIterable<StreamTextEvent>,
): AsyncIterable<StreamPart> {
  return {
    async *[Symbol.asyncIterator]() {
      for await (const part of originalStream) {
        const mappedPart = mapToStreamPart(part);
        if (mappedPart !== null) {
          yield mappedPart;
        }
      }
    },
  };
}

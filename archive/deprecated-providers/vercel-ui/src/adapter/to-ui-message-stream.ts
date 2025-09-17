import type { StreamPart } from "@voltagent/core";
import type { UIMessageChunk } from "ai";
import { convertAsyncIteratorToReadableStream } from "ai/internal";
import { type StreamCallbacks, createCallbacksTransformer } from "./stream-callbacks";

/**
 * Converts VoltAgent output streams to an AI SDK UI Message Stream.
 *
 * This adapter follows the same pattern as LangChain and LlamaIndex adapters,
 * providing seamless integration with Vercel AI SDK UI components.
 *
 * @example
 * ```typescript
 * import { toUIMessageStream } from '@voltagent/vercel-ui';
 * import { createUIMessageStreamResponse } from 'ai';
 *
 * const result = await agent.streamText(prompt);
 * const uiStream = toUIMessageStream(result.fullStream);
 * return createUIMessageStreamResponse({ stream: uiStream });
 * ```
 *
 * @param stream - The VoltAgent stream (typically from agent.streamText().fullStream)
 * @param callbacks - Optional callbacks for stream events
 * @returns A ReadableStream of UIMessageChunk compatible with AI SDK
 */
export function toUIMessageStream(
  stream: AsyncIterable<StreamPart>,
  callbacks?: StreamCallbacks,
): ReadableStream<UIMessageChunk> {
  // Keep track of whether we're in the middle of streaming text
  let isStreamingText = false;
  let currentTextId = "1";
  let currentSubAgentId: string | undefined = undefined;

  return convertAsyncIteratorToReadableStream(stream[Symbol.asyncIterator]())
    .pipeThrough(
      new TransformStream<StreamPart, UIMessageChunk>({
        async start(controller) {
          // Emit start event
          controller.enqueue({ type: "start" });
          controller.enqueue({ type: "start-step" });
        },

        async transform(part: StreamPart, controller) {
          switch (part.type) {
            case "text-delta": {
              // Check if this text-delta is from a subagent
              const hasSubAgent = "subAgentId" in part && part.subAgentId;

              // Detect agent transitions (from one agent to another or main to sub)
              if (currentSubAgentId !== part.subAgentId) {
                // If we were streaming text from a different agent, end it
                if (isStreamingText) {
                  controller.enqueue({
                    type: "text-end",
                    id: currentTextId,
                  });
                  isStreamingText = false;
                  currentTextId = String(Number(currentTextId) + 1);
                }

                // Emit subagent metadata when switching to a subagent
                if (hasSubAgent) {
                  controller.enqueue({
                    type: "data-subagent",
                    id: part.subAgentId,
                    data: {
                      subAgentId: part.subAgentId,
                      subAgentName: part.subAgentName || "Unknown SubAgent",
                    },
                  });
                }

                // Update current subagent tracking
                currentSubAgentId = part.subAgentId;
              }

              // Start text streaming if not already started
              if (!isStreamingText) {
                controller.enqueue({
                  type: "text-start",
                  id: currentTextId,
                });
                isStreamingText = true;
              }

              // Emit text delta (without custom fields to avoid type validation errors)
              controller.enqueue({
                type: "text-delta",
                delta: part.textDelta,
                id: currentTextId,
              });
              break;
            }

            case "tool-call": {
              // End text streaming if active
              if (isStreamingText) {
                controller.enqueue({
                  type: "text-end",
                  id: currentTextId,
                });
                isStreamingText = false;
                currentTextId = String(Number(currentTextId) + 1);
              }

              // Emit tool input events - these will be transformed to tool-${toolName} format by processUIMessageStream
              controller.enqueue({
                type: "tool-input-start",
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                dynamic: false,
              });

              controller.enqueue({
                type: "tool-input-available",
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                input: part.args,
                dynamic: false,
              });
              break;
            }

            case "tool-result": {
              if (part.toolCallId) {
                controller.enqueue({
                  type: "tool-output-available",
                  toolCallId: part.toolCallId,
                  // toolName is not needed here - it's retrieved from the previous tool-input-available chunk
                  output: part.result,
                  dynamic: false,
                });
              }
              break;
            }

            case "reasoning": {
              // End text streaming if active
              if (isStreamingText) {
                controller.enqueue({
                  type: "text-end",
                  id: currentTextId,
                });
                isStreamingText = false;
                currentTextId = String(Number(currentTextId) + 1);
              }

              // In v5, we need to use reasoning-delta for streaming reasoning
              const reasoningId = "1";
              controller.enqueue({
                type: "reasoning-start",
                id: reasoningId,
              });

              controller.enqueue({
                type: "reasoning-delta",
                id: reasoningId,
                delta: part.reasoning,
              });

              controller.enqueue({
                type: "reasoning-end",
                id: reasoningId,
              });
              break;
            }

            case "source": {
              controller.enqueue({
                type: "source-url",
                sourceId: part.source,
                url: part.source,
                title: undefined,
              });
              break;
            }

            case "error": {
              // End text streaming if active
              if (isStreamingText) {
                controller.enqueue({
                  type: "text-end",
                  id: currentTextId,
                });
                isStreamingText = false;
              }

              controller.enqueue({
                type: "error",
                errorText: part.error.message || "An error occurred",
              });
              break;
            }

            case "finish": {
              // End text streaming if still active
              if (isStreamingText) {
                controller.enqueue({
                  type: "text-end",
                  id: currentTextId,
                });
                isStreamingText = false;
              }

              // Add usage metadata if available
              if (part.usage) {
                controller.enqueue({
                  type: "message-metadata",
                  messageMetadata: {
                    usage: {
                      promptTokens: part.usage.promptTokens,
                      completionTokens: part.usage.completionTokens,
                      totalTokens: part.usage.totalTokens,
                    },
                  },
                });
              }
              break;
            }

            // Ignore other types for now
            default:
              break;
          }

          // SubAgent metadata is now handled within each event type
          // No need for separate handling here
        },

        async flush(controller) {
          // End text streaming if still active
          if (isStreamingText) {
            controller.enqueue({
              type: "text-end",
              id: currentTextId,
            });
            isStreamingText = false;
          }

          // Reset subagent tracking
          currentSubAgentId = undefined;

          // Emit finish events
          controller.enqueue({ type: "finish-step" });
          controller.enqueue({ type: "finish" });
        },
      }),
    )
    .pipeThrough(createCallbacksTransformer(callbacks));
}

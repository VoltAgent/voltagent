import type * as Volt from "@voltagent/core";
import { type FinishReason, formatDataStreamPart } from "ai";
import { generateMessageId } from "../utils/identifiers";

export type StreamTextToResponseOptions = Omit<
  Volt.StreamTextOptions<any>,
  "messages" | "model"
> & {
  userId?: string;
  conversationId?: string;
};

/**
 * Streams text to a response.
 * @param agent - The agent to stream text from.
 * @param input - The input to stream.
 * @param options - The options for the stream.
 * @returns A readable stream.
 */
export function streamTextToResponse(
  agent: Volt.Agent<any>,
  input: string | Volt.BaseMessage[],
  options: StreamTextToResponseOptions,
) {
  return new ReadableStream({
    async start(controller) {
      try {
        // Create a flag to track if stream has been closed
        let streamClosed = false;

        // Helper function to safely enqueue data
        const safeEnqueue = (data: string) => {
          if (!streamClosed) {
            try {
              controller.enqueue(new TextEncoder().encode(data));
            } catch (e) {
              console.error("Failed to enqueue data:", e);
              streamClosed = true;
            }
          }
        };

        // Helper function to safely close stream
        const safeClose = () => {
          if (!streamClosed) {
            try {
              controller.close();
              streamClosed = true;
            } catch (e) {
              console.error("Failed to close controller:", e);
            }
          }
        };

        const response = await agent.streamText(input, {
          ...options,
          provider: {
            ...options.provider,
            toolCallStreaming: false,
          },
        });

        // Iterate through the full stream if available, otherwise fallback to text stream
        try {
          if (response.fullStream) {
            const stream = response.fullStream as AsyncIterable<StreamPart>;

            for await (const part of stream) {
              if (streamClosed) break;

              switch (part.type) {
                case "text-delta": {
                  // we ignore sub-agent stream parts here
                  if (isSubAgentStreamPart(part)) {
                    break;
                  }

                  safeEnqueue(formatDataStreamPart("text", part.textDelta));
                  break;
                }
                case "reasoning": {
                  safeEnqueue(formatDataStreamPart("reasoning", part.reasoning));
                  break;
                }
                case "source": {
                  safeEnqueue(
                    formatDataStreamPart("source", {
                      sourceType: "url",
                      id: part.source,
                      url: part.source,
                    }),
                  );
                  break;
                }
                case "tool-call": {
                  safeEnqueue(
                    formatDataStreamPart("tool_call", {
                      toolCallId: part.toolCallId,
                      toolName: part.toolName,
                      args: part.args,
                    }),
                  );
                  break;
                }
                case "tool-result": {
                  safeEnqueue(
                    formatDataStreamPart("tool_result", {
                      toolCallId: part.toolCallId,
                      result: part.result,
                    }),
                  );
                  // We MUST finish the step here, otherwise this will not merge/be handled correctly by the client.
                  safeEnqueue(
                    formatDataStreamPart("finish_step", {
                      isContinued: isSubAgentStreamPart(part),
                      finishReason: "tool-calls",
                    }),
                  );

                  // Don't close stream for tool errors - continue processing
                  // Note: SubAgent events are now forwarded in real-time via streamEventForwarder
                  // No need to parse delegate_task results for batch forwarding
                  break;
                }
                case "finish": {
                  safeEnqueue(
                    formatDataStreamPart("finish_message", {
                      finishReason: (part.finishReason as FinishReason) ?? "stop",
                      usage: part.usage,
                    }),
                  );
                  break;
                }
                case "error": {
                  const error = part.error as any;
                  const isToolError = error?.constructor?.name === "ToolExecutionError";
                  const errorMessage = (part.error as Error)?.message || "Stream error occurred";

                  safeEnqueue(formatDataStreamPart("error", errorMessage));

                  // Don't close stream for tool errors
                  if (!isToolError) {
                    safeClose();
                    return;
                  }
                  break;
                }
              }
            }
          } else {
            throw new Error("No full stream available");
          }

          // Send completion message if stream completed successfully
          if (!streamClosed) {
            safeClose();
          }
        } catch (iterationError) {
          // Handle errors during stream iteration
          // @todo: migrate to devLogger
          console.error("Error during stream iteration:", iterationError);
          const errorData = {
            error: (iterationError as Error)?.message ?? "Stream iteration failed",
            timestamp: new Date().toISOString(),
            type: "error",
            code: "ITERATION_ERROR",
          };
          const errorMessage = `data: ${JSON.stringify(errorData)}\n\n`;
          safeEnqueue(errorMessage);
          safeClose();
        }
      } catch (error) {
        // Handle errors during initial setup
        console.error("Error during stream setup:", error);
        const errorData = {
          error: error instanceof Error ? error.message : "Stream setup failed",
          timestamp: new Date().toISOString(),
          type: "error",
          code: "SETUP_ERROR",
        };
        const errorMessage = `data: ${JSON.stringify(errorData)}\n\n`;
        try {
          controller.enqueue(new TextEncoder().encode(errorMessage));
        } catch (e) {
          console.error("Failed to enqueue setup error message:", e);
        }
        try {
          controller.close();
        } catch (e) {
          console.error("Failed to close controller after setup error:", e);
        }
      }
    },
    cancel(reason) {
      console.log("Stream cancelled:", reason);
    },
  });
}

/**
 * Check if a stream part is a sub-agent stream part.
 * @param part - The stream part to check.
 * @returns True if the stream part is a sub-agent stream part, false otherwise.
 */
export function isSubAgentStreamPart(part: StreamPart): part is SubAgentStreamPart {
  return [
    "subAgentId" in part,
    "subAgentName" in part,
    typeof part.subAgentId === "string",
    typeof part.subAgentName === "string",
  ].every((v) => v === true);
}

export type SubAgentStreamPart = Volt.StreamPart & {
  subAgentId: string;
  subAgentName: string;
};

export type StreamPart = SubAgentStreamPart | Volt.StreamPart;

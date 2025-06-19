import type * as UIUtils from "@ai-sdk/ui-utils";
import type { StreamPart } from "@voltagent/core";
import { devLogger } from "@voltagent/internal/dev";
import { formatDataStreamPart as formatDataStreamPartBase } from "ai";
import type * as AI from "ai";
import { P, match } from "ts-pattern";
import type { DataStreamPartType, DataStreamPartValueType } from "./type-utils";

export type SubAgentStreamPart = StreamPart & {
  subAgentId: string;
  subAgentName: string;
};

export type DataStream = ReadableStream<DataStreamString>;

export type DataStreamString = UIUtils.DataStreamString;

export type DataStreamOptions = AI.DataStreamOptions & {
  /**
   * A function to get the error message from an error.
   * @param error - The error to get the message from.
   * @returns The error message.
   */
  getErrorMessage?: (error: unknown) => string;
  /**
   * A function to exclude a stream part from the data stream. You can use this to exclude certain stream parts from the data stream based on the type, the agent data or other criteria.
   * By default text data is excluded.
   *
   * @param streamPart - The stream part to exclude.
   * @returns True if the stream part should be excluded, false otherwise.
   */
  exclude?: (streamPart: StreamPart) => boolean;
};

export type FullStream = AsyncIterable<StreamPart>;

/**
 * Formats a data stream part for vercel `ai` package but appends additional data to tool-calls and tool-results from VoltAgent.
 * @param type - The type of the data stream part.
 * @param value - The value of the data stream part.
 * @returns The formatted data stream part.
 */
export function formatDataStreamPart<
  TYPE extends DataStreamPartType,
  VALUE extends DataStreamPartValueType[TYPE],
>(type: TYPE, value: VALUE): DataStreamString {
  return formatDataStreamPartBase(type, value);
}

/**
 * Merges a readable stream into a data stream.
 * @param writer - The data stream writer to merge into.
 * @param stream - The readable stream to merge usually from streamTextToReadableStream.
 * @returns The merged data stream.
 */
export function mergeIntoDataStream(
  writer: AI.DataStreamWriter,
  fullStream: FullStream,
  options?: DataStreamOptions,
) {
  writer.merge(
    toDataStream(fullStream, {
      getErrorMessage: writer.onError,
      sendUsage: options?.sendUsage,
      sendReasoning: options?.sendReasoning,
      sendSources: options?.sendSources,
      experimental_sendFinish: options?.experimental_sendFinish,
    }),
  );
}

/**
 * Streams text to a response.
 * @param agent - The agent to stream text from.
 * @param input - The input to stream.
 * @param options - The options for the stream.
 * @returns A readable stream.
 */
export function toDataStream(
  fullStream: FullStream,
  options?: DataStreamOptions,
): ReadableStream<DataStreamString> {
  const {
    getErrorMessage = () => "An error occurred.", // mask error messages for safety by default
    sendUsage = true,
    sendReasoning = false,
    sendSources = false,
    experimental_sendFinish = true,
  } = options ?? {};

  function exclude(streamPart: StreamPart) {
    if (options?.exclude) {
      return options.exclude(streamPart);
    }

    // the Supervisor should be controlling the text stream, the primary idea with fullStream is to surface tool calls and other metadata
    if (isSubAgentStreamPart(streamPart) && streamPart.type === "text-delta") {
      return true;
    }

    return false;
  }

  return new ReadableStream({
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: this is a complex stream and no need to refactor it
    async start(controller) {
      try {
        // Create a flag to track if stream has been closed
        let streamClosed = false;

        // Helper function to safely enqueue data
        const safeEnqueue = (data: DataStreamString) => {
          if (!streamClosed) {
            try {
              controller.enqueue(data);
            } catch (e) {
              devLogger.error("Failed to enqueue data:", e);
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
              devLogger.error("Failed to close controller:", e);
            }
          }
        };

        try {
          for await (const streamPart of fullStream) {
            if (streamClosed) break;

            // skip excluded stream parts
            if (exclude(streamPart)) {
              continue;
            }

            switch (streamPart.type) {
              case "text-delta": {
                safeEnqueue(formatDataStreamPart("text", streamPart.textDelta));
                break;
              }
              case "reasoning": {
                if (sendReasoning) {
                  safeEnqueue(formatDataStreamPart("reasoning", streamPart.reasoning));
                }
                break;
              }
              case "source": {
                if (sendSources) {
                  safeEnqueue(
                    formatDataStreamPart("source", {
                      sourceType: "url",
                      id: streamPart.source,
                      url: streamPart.source,
                    }),
                  );
                }
                break;
              }
              case "tool-call": {
                safeEnqueue(
                  formatDataStreamPart("tool_call", {
                    toolCallId: streamPart.toolCallId,
                    toolName: cleanToolName(streamPart.toolName),
                    args: streamPart.args,
                    subAgentName: streamPart?.subAgentName ?? undefined,
                    subAgentId: streamPart?.subAgentId ?? undefined,
                    subAgent: isSubAgentStreamPart(streamPart),
                  }),
                );
                break;
              }
              case "tool-result": {
                safeEnqueue(
                  formatDataStreamPart("tool_result", {
                    toolCallId: streamPart.toolCallId,
                    result: streamPart.result,
                    subAgentName: streamPart?.subAgentName ?? undefined,
                    subAgentId: streamPart?.subAgentId ?? undefined,
                    subAgent: isSubAgentStreamPart(streamPart),
                  }),
                );
                safeEnqueue(
                  formatDataStreamPart("finish_step", {
                    isContinued: false,
                    finishReason: "tool-calls",
                  }),
                );

                // Don't close stream for tool errors - continue processing
                // Note: SubAgent events are now forwarded in real-time via streamEventForwarder
                // No need to parse delegate_task results for batch forwarding
                break;
              }
              case "finish": {
                if (experimental_sendFinish) {
                  safeEnqueue(
                    formatDataStreamPart("finish_message", {
                      finishReason: match(streamPart.finishReason)
                        .returnType<AI.FinishReason>()
                        .with(P.string, (reason) => reason as AI.FinishReason)
                        .otherwise(() => "stop"),
                      usage: match({ usage: streamPart.usage, sendUsage })
                        .with({ usage: P.not(P.nullish), sendUsage: true }, ({ usage }) => usage)
                        .with({ sendUsage: false }, () => undefined)
                        .otherwise(() => ({
                          promptTokens: 0,
                          completionTokens: 0,
                        })),
                    }),
                  );
                }
                break;
              }
              case "error": {
                safeEnqueue(formatDataStreamPart("error", getErrorMessage(streamPart.error)));

                // Don't close stream for tool errors
                if (!isToolError(streamPart.error)) {
                  safeClose();
                  return;
                }
                break;
              }
            }
          }

          if (!streamClosed) {
            // Send completion message if stream completed successfully
            safeClose();
          }
        } catch (iterationError) {
          // Handle errors during stream iteration
          devLogger.error("Error during stream iteration:", iterationError);
          const errorMessage = getErrorMessage(iterationError);
          safeEnqueue(formatDataStreamPart("error", errorMessage));
          safeClose();
        }
      } catch (error) {
        // Handle errors during initial setup
        devLogger.error("Error during stream setup:", error);
        const errorMessage = getErrorMessage(error);
        try {
          controller.enqueue(formatDataStreamPart("error", errorMessage));
        } catch (e) {
          devLogger.error("Failed to enqueue setup error message:", e);
        }
        try {
          controller.close();
        } catch (e) {
          devLogger.error("Failed to close controller after setup error:", e);
        }
      }
    },
    cancel(reason) {
      devLogger.warn("Stream cancelled:", reason);
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

/*
|------------------
| Internals
|------------------
*/

function cleanToolName(toolName: string): string {
  return toolName.replace(/^[a-zA-Z0-9_-]+:/, "").trim();
}

function isToolError(error: unknown): boolean {
  return error?.constructor?.name === "ToolExecutionError";
}

import type {
  BaseMessage,
  GenerateObjectOptions,
  GenerateTextOptions,
  LLMProvider,
  MessageRole,
  ProviderObjectResponse,
  ProviderObjectStreamResponse,
  ProviderTextResponse,
  ProviderTextStreamResponse,
  StepWithContent,
  StreamObjectFinishResult,
  StreamObjectOptions,
  StreamPart,
  StreamTextOptions,
  ToolErrorInfo,
  UsageInfo,
  VoltAgentError,
} from "@voltagent/core";
import type {
  CallWarning,
  CoreMessage,
  FinishReason,
  GenerateObjectResult,
  GenerateTextResult,
  LanguageModelRequestMetadata,
  LanguageModelResponseMetadata,
  LanguageModelUsage,
  LanguageModelV1,
  ProviderMetadata,
  StepResult,
  StreamObjectResult,
  StreamTextResult,
  TextStreamPart,
} from "ai";
import { generateId, generateObject, generateText, streamObject, streamText } from "ai";
import { P, match } from "ts-pattern";
import type { z } from "zod";
import { convertToolsForSDK } from "./utils";

export class VercelAIProvider implements LLMProvider<LanguageModelV1> {
  /**
   * Provider `generateText` implementation
   * @param options - The options for the generate text operation
   * @returns A standardized response for VoltAgent
   */
  public async generateText(
    options: GenerateTextOptions<LanguageModelV1>,
  ): Promise<ProviderTextResponse<GenerateTextResult<Record<string, any>, never>>> {
    const vercelMessages = options.messages.map(this.toMessage);
    const vercelTools = options.tools ? convertToolsForSDK(options.tools) : undefined;

    // Process onStepFinish if provided
    const onStepFinish = options.onStepFinish
      ? async (result: StepResult<Record<string, any>>) => {
          if (options.onStepFinish) {
            // Handle text response
            if (result.text) {
              const step = this.createStepFromChunk({
                type: "text",
                text: result.text,
                usage: result.usage,
              });
              if (step) await options.onStepFinish(step);
            }

            // Handle all tool calls - each as a separate step
            if (result.toolCalls && result.toolCalls.length > 0) {
              for (const toolCall of result.toolCalls) {
                const step = this.createStepFromChunk({
                  type: "tool-call",
                  toolCallId: toolCall.toolCallId,
                  toolName: toolCall.toolName,
                  args: toolCall.args,
                  usage: result.usage,
                });
                if (step) await options.onStepFinish(step);
              }
            }

            // Handle all tool results - each as a separate step
            if (result.toolResults && result.toolResults.length > 0) {
              for (const toolResult of result.toolResults) {
                const step = this.createStepFromChunk({
                  type: "tool-result",
                  toolCallId: toolResult.toolCallId,
                  toolName: toolResult.toolName,
                  result: toolResult.result,
                  usage: result.usage,
                });
                if (step) await options.onStepFinish(step);
              }
            }
          }
        }
      : undefined;

    try {
      const result = await generateText({
        ...options.provider,
        messages: vercelMessages,
        model: options.model,
        tools: vercelTools,
        maxSteps: options.maxSteps,
        abortSignal: options.signal,
        onStepFinish,
      });

      // Return standardized response
      return {
        provider: result,
        text: result.text || "",
        usage: result.usage
          ? {
              promptTokens: result.usage.promptTokens,
              completionTokens: result.usage.completionTokens,
              totalTokens: result.usage.totalTokens,
            }
          : undefined,
        toolCalls: result.toolCalls,
        toolResults: result.toolResults,
        finishReason: result.finishReason,
      };
    } catch (sdkError) {
      // Create VoltAgentError using the helper
      const voltagentErr = this.createVoltagentErrorFromSdkError(sdkError, "llm_generate"); // Use appropriate stage
      // Throw the standardized error
      throw voltagentErr;
    }
  }

  /**
   * Provider `streamText` implementation
   * @param options - The options for the stream text operation
   * @returns A standardized response for VoltAgent
   */
  public async streamText(
    options: StreamTextOptions<LanguageModelV1>,
  ): Promise<ProviderTextStreamResponse<StreamTextResult<Record<string, any>, never>>> {
    try {
      const vercelMessages = options.messages.map(this.toMessage);
      const vercelTools = options.tools ? convertToolsForSDK(options.tools) : undefined;

      // Process onStepFinish if provided
      const onStepFinish = options.onStepFinish
        ? async (result: StepResult<Record<string, any>>) => {
            if (options.onStepFinish) {
              // Handle text response
              if (result.text) {
                const step = this.createStepFromChunk({
                  type: "text",
                  text: result.text,
                  usage: result.usage,
                });
                if (step) await options.onStepFinish(step);
              }

              // Handle all tool calls - each as a separate step
              if (result.toolCalls && result.toolCalls.length > 0) {
                for (const toolCall of result.toolCalls) {
                  const step = this.createStepFromChunk({
                    type: "tool-call",
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    args: toolCall.args,
                    usage: result.usage,
                  });
                  if (step) await options.onStepFinish(step);
                }
              }

              // Handle all tool results - each as a separate step
              if (result.toolResults && result.toolResults.length > 0) {
                for (const toolResult of result.toolResults) {
                  const step = this.createStepFromChunk({
                    type: "tool-result",
                    toolCallId: toolResult.toolCallId,
                    toolName: toolResult.toolName,
                    result: toolResult.result,
                    usage: result.usage,
                  });
                  if (step) await options.onStepFinish(step);
                }
              }
            }
          }
        : undefined;

      const result = streamText({
        ...options.provider,
        messages: vercelMessages,
        model: options.model,
        tools: vercelTools,
        maxSteps: options.maxSteps,
        abortSignal: options.signal,
        onStepFinish,
        onChunk: async ({ chunk }) => {
          if (options?.onChunk) {
            // Handle the chunk directly without usage tracking
            const step = this.createStepFromChunk(chunk);
            if (step) await options.onChunk(step);
          }
        },
        onFinish: options.onFinish
          ? async (
              result: Omit<StepResult<Record<string, any>>, "stepType" | "isContinued"> & {
                readonly steps: StepResult<Record<string, any>>[];
              },
            ) => {
              options.onFinish?.({
                text: result.text,
                usage: result.usage,
                finishReason: result.finishReason,
                warnings: result.warnings,
                providerResponse: result,
              });
            }
          : undefined,
        onError: (sdkError) => {
          // Create the error using the helper
          const voltagentErr = this.createVoltagentErrorFromSdkError(sdkError, "llm_stream");
          // Call the agent's onError callback if it exists
          if (options.onError) {
            options.onError(voltagentErr);
          }
        },
      });

      // Return provider, textStream, and mapped fullStream
      return {
        provider: result,
        textStream: result.textStream as any,
        fullStream: this.createMappedFullStream(result.fullStream),
      };
    } catch (error) {
      throw this.createVoltagentErrorFromSdkError(error, "llm_stream");
    }
  }

  /**
   * Provider `generateObject` implementation
   * @param options - The options for the generate object operation
   * @returns A standardized response for VoltAgent
   */
  public async generateObject<TSchema extends z.ZodType>(
    options: GenerateObjectOptions<LanguageModelV1, TSchema>,
  ): Promise<ProviderObjectResponse<GenerateObjectResult<z.infer<TSchema>>, z.infer<TSchema>>> {
    const vercelMessages = options.messages.map(this.toMessage);

    // For object generation, we use onFinish as onStepFinish is not supported
    const onFinish = match(options)
      .with({ onStepFinish: P.not(P.nullish) }, (o) => {
        return async (result: {
          object: z.infer<TSchema>;
          finishReason: FinishReason;
          usage: LanguageModelUsage;
          warnings: CallWarning[] | undefined;
          request: LanguageModelRequestMetadata;
          response: LanguageModelResponseMetadata;
          logprobs: any | undefined;
          providerMetadata: ProviderMetadata | undefined;
        }) => {
          const step = this.createStepFromChunk({
            type: "text",
            text: match(result.object)
              .with(P.string, (s) => s)
              .otherwise((o) => JSON.stringify(o)),
            usage: result.usage,
          });

          if (step) {
            await o.onStepFinish(step);
          }
        };
      })
      .otherwise(() => undefined);

    try {
      const result = await generateObject({
        ...options.provider,
        messages: vercelMessages,
        model: options.model,
        schema: options.schema,
        abortSignal: options.signal,
      });

      // Call the custom onFinish handler if defined
      await onFinish?.(result);

      // Return standardized response
      return {
        provider: result,
        object: result.object,
        usage: result.usage
          ? {
              promptTokens: result.usage.promptTokens,
              completionTokens: result.usage.completionTokens,
              totalTokens: result.usage.totalTokens,
            }
          : undefined,
        finishReason: result.finishReason,
      };
    } catch (sdkError) {
      // Create VoltAgentError using the helper
      const voltagentErr = this.createVoltagentErrorFromSdkError(sdkError, "object_generate"); // Use appropriate stage
      // Throw the standardized error
      throw voltagentErr;
    }
  }

  /**
   * Stream object
   * @param options - The options for the stream object operation
   * @returns The streamed object
   */
  public async streamObject<TSchema extends z.ZodType>(
    options: StreamObjectOptions<LanguageModelV1, TSchema>,
  ): Promise<
    ProviderObjectStreamResponse<
      StreamObjectResult<z.infer<TSchema>, unknown, never>,
      z.infer<TSchema>
    >
  > {
    const vercelMessages = options.messages.map(this.toMessage);

    // Define the onFinish handler to be passed to the Vercel SDK
    const sdkOnFinish = async (event: {
      // Type for Vercel SDK event
      object: z.infer<TSchema> | undefined;
      error: unknown | undefined; // Handle potential error in event?
      usage: LanguageModelUsage;
      response: LanguageModelResponseMetadata;
      warnings?: CallWarning[];
      providerMetadata: ProviderMetadata | undefined;
    }) => {
      // --- Handle onStepFinish simulation (if provided by Agent) ---
      // This uses the final object/usage info from the finish event
      if (options.onStepFinish) {
        const jsonResult = event.object ? JSON.stringify(event.object) : "";
        const step = this.createStepFromChunk({
          type: "text", // Simulate as a text step containing the final JSON
          text: jsonResult,
          usage: event.usage, // Use usage from the event
        });
        if (step) {
          await options.onStepFinish(step);
        }
      }
      // --- End handle onStepFinish simulation ---

      // --- Handle onFinish callback (if provided by Agent) ---
      if (options.onFinish && event.object) {
        // Check if Agent wants onFinish and object exists
        let mappedUsage: UsageInfo | undefined = undefined;
        if (event.usage) {
          mappedUsage = {
            promptTokens: event.usage.promptTokens,
            completionTokens: event.usage.completionTokens,
            totalTokens: event.usage.totalTokens,
          };
        }
        // Construct the standardized result object
        const finishResult: StreamObjectFinishResult<z.infer<TSchema>> = {
          object: event.object, // The final object from the event
          usage: mappedUsage, // Mapped usage info
          warnings: event.warnings,
          providerResponse: event, // Include the original SDK event object
          // finishReason is not typically available in Vercel's streamObject finish event
        };
        // Call the agent's onFinish with the standardized result
        await options.onFinish(finishResult);
      }
      // --- End handle onFinish callback ---
    };

    const result = streamObject({
      ...options.provider,
      messages: vercelMessages,
      model: options.model,
      schema: options.schema,
      abortSignal: options.signal,
      // Pass the correctly defined sdkOnFinish handler
      // Only pass it if either onStepFinish or onFinish is provided by the agent
      ...(options.onStepFinish || options.onFinish ? { onFinish: sdkOnFinish } : {}),
      onError: (sdkError) => {
        // Create the error using the helper
        const voltagentErr = this.createVoltagentErrorFromSdkError(sdkError, "object_stream");
        // Call the agent's onError callback if it exists
        if (options.onError) {
          options.onError(voltagentErr);
        }
      },
    });

    // TODO: Add usage to the result - https://sdk.vercel.ai/docs/reference/ai-sdk-core/stream-object
    const partialObjectStream = result.partialObjectStream;
    // Return only provider and objectStream
    return {
      provider: { ...result, partialObjectStream },
      objectStream: partialObjectStream,
    };
  }

  /**
   * Get the model identifier
   * @param model - The model to get the identifier for
   * @returns The model identifier
   */
  public getModelIdentifier(model: LanguageModelV1): string {
    return model.modelId;
  }

  /**
   * Convert a VoltAgent message to a Vercel AI message
   * @param message - The VoltAgent message to convert
   * @returns The Vercel AI message
   */
  public toMessage(message: BaseMessage): CoreMessage {
    return message as CoreMessage;
  }

  /**
   * Create a step from a chunk
   * @param chunk - The chunk to create a step from
   * @returns The step or null if the chunk is not supported
   */
  public createStepFromChunk(chunk: {
    type: string;
    [key: string]: any;
  }): StepWithContent | null {
    return match(chunk)
      .returnType<StepWithContent | null>()
      .when(
        (c) => c.type === "text" && c.text,
        (c) => ({
          id: generateId(),
          type: "text",
          content: c.text,
          role: "assistant" as MessageRole,
          usage: c.usage || undefined,
        }),
      )
      .with({ type: P.union("tool-call", "tool_call") }, (c) => ({
        id: c.toolCallId,
        type: "tool_call",
        name: c.toolName,
        arguments: c.args,
        content: JSON.stringify([
          {
            type: "tool-call",
            toolCallId: c.toolCallId,
            toolName: c.toolName,
            args: c.args,
          },
        ]),
        role: "assistant" as MessageRole,
        usage: c.usage || undefined,
      }))
      .with({ type: P.union("tool-result", "tool_result") }, (c) => ({
        id: c.toolCallId,
        type: "tool_result",
        name: c.toolName,
        result: c.result,
        content: JSON.stringify([
          {
            type: "tool-result",
            toolCallId: c.toolCallId,
            toolName: c.toolName,
            result: c.result,
          },
        ]),
        role: "assistant" as MessageRole,
        usage: c.usage || undefined,
      }))
      .otherwise(() => null);
  }

  /**
   * Creates a standardized VoltAgentError from a raw Vercel SDK error object.
   */
  private createVoltagentErrorFromSdkError(
    sdkError: any, // The raw error object from the SDK
    errorStage:
      | "llm_stream"
      | "object_stream"
      | "llm_generate"
      | "object_generate"
      | "tool_execution" = "llm_stream",
  ): VoltAgentError {
    const originalError = sdkError.error ?? sdkError; // Handle potential nesting
    let voltagentErr: VoltAgentError;

    const potentialToolCallId = (originalError as any)?.toolCallId;
    const potentialToolName = (originalError as any)?.toolName;

    if (potentialToolCallId && potentialToolName) {
      const toolErrorDetails: ToolErrorInfo = {
        toolCallId: potentialToolCallId,
        toolName: potentialToolName,
        toolArguments: (originalError as any)?.args,
        toolExecutionError: originalError,
      };
      voltagentErr = {
        message: `Error during Vercel SDK operation (tool '${potentialToolName}'): ${originalError instanceof Error ? originalError.message : "Unknown tool error"}`,
        originalError: originalError,
        toolError: toolErrorDetails,
        stage: "tool_execution",
        code: (originalError as any)?.code,
      };
    } else {
      voltagentErr = {
        message:
          originalError instanceof Error
            ? originalError.message
            : `An unknown error occurred during Vercel AI operation (stage: ${errorStage})`,
        originalError: originalError,
        toolError: undefined,
        stage: errorStage,
        code: (originalError as any)?.code,
      };
    }

    return voltagentErr;
  }

  /**
   * Map Vercel AI TextStreamPart to our standard StreamPart
   * @param part - The part to map
   * @returns The mapped part or null if the part is not supported
   */
  private mapToStreamPart(part: TextStreamPart<Record<string, any>>): StreamPart | null {
    switch (part.type) {
      case "text-delta":
        return {
          type: "text-delta",
          textDelta: part.textDelta,
        };
      case "reasoning":
        return {
          type: "reasoning",
          reasoning: part.textDelta, // Vercel AI uses textDelta for reasoning content
        };
      case "source":
        return {
          type: "source",
          source: part.source.url || "", // Extract source URL
        };
      case "tool-call":
        return {
          type: "tool-call",
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          args: part.args,
        };
      case "tool-result":
        return {
          type: "tool-result",
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          result: part.result,
        };
      case "finish":
        return {
          type: "finish",
          finishReason: part.finishReason,
          usage: match(part)
            .with({ usage: P.not(P.nullish) }, (p) => ({
              promptTokens: p.usage.promptTokens,
              completionTokens: p.usage.completionTokens,
              totalTokens: p.usage.totalTokens,
            }))
            .otherwise(() => undefined),
        };
      case "error":
        return {
          type: "error",
          error: part.error as Error,
        };
      default:
        // Skip unsupported part types
        return null;
    }
  }

  /**
   * Create mapped fullStream that converts Vercel AI parts to our standard parts
   * @param originalStream - The original stream of parts from the Vercel AI SDK
   * @returns A new stream of parts that are converted to our standard parts
   */
  private createMappedFullStream(
    originalStream: AsyncIterable<TextStreamPart<Record<string, any>>>,
  ): AsyncIterable<StreamPart> {
    const self = this;
    return {
      async *[Symbol.asyncIterator]() {
        for await (const part of originalStream) {
          const mappedPart = self.mapToStreamPart(part);
          if (mappedPart !== null) {
            yield mappedPart;
          }
        }
      },
    };
  }
}

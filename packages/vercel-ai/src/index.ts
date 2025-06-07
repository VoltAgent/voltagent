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
  StreamTextOptions,
  ToolErrorInfo,
  UsageInfo,
  VoltAgentError,
} from "@voltagent/core";
// Import directly from the types file path within the dist folder
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
} from "ai";
import { generateObject, generateText, streamObject, streamText } from "ai";
import type { z } from "zod";
import type { VercelProviderOptions } from "./types";
import { convertToolsForSDK } from "./utils";

export class VercelAIProvider implements LLMProvider<LanguageModelV1> {
  // @ts-ignore
  constructor(private options?: VercelProviderOptions) {
    // Bind methods to preserve 'this' context
    this.generateText = this.generateText.bind(this);
    this.streamText = this.streamText.bind(this);
    this.generateObject = this.generateObject.bind(this);
    this.streamObject = this.streamObject.bind(this);
    this.toMessage = this.toMessage.bind(this);
    this.createStepFromChunk = this.createStepFromChunk.bind(this);
    this.getModelIdentifier = this.getModelIdentifier.bind(this);
  }

  getModelIdentifier = (model: LanguageModelV1): string => {
    return model.modelId;
  };

  toMessage = (message: BaseMessage): CoreMessage => {
    return message as CoreMessage;
  };

  createStepFromChunk = (chunk: {
    type: string;
    [key: string]: any;
  }): StepWithContent | null => {
    if (chunk.type === "text" && chunk.text) {
      return {
        id: "",
        type: "text",
        content: chunk.text,
        role: "assistant" as MessageRole,
        usage: chunk.usage || undefined,
      };
    }

    if (chunk.type === "tool-call" || chunk.type === "tool_call") {
      return {
        id: chunk.toolCallId,
        type: "tool_call",
        name: chunk.toolName,
        arguments: chunk.args,
        content: JSON.stringify([
          {
            type: "tool-call",
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            args: chunk.args,
          },
        ]),
        role: "assistant" as MessageRole,
        usage: chunk.usage || undefined,
      };
    }

    if (chunk.type === "tool-result" || chunk.type === "tool_result") {
      return {
        id: chunk.toolCallId,
        type: "tool_result",
        name: chunk.toolName,
        result: chunk.result,
        content: JSON.stringify([
          {
            type: "tool-result",
            toolCallId: chunk.toolCallId,
            result: chunk.result,
          },
        ]),
        role: "assistant" as MessageRole,
        usage: chunk.usage || undefined,
      };
    }

    return null;
  };

  /**
   * Creates a standardized VoltAgentError from a raw Vercel SDK error object.
   */
  private _createVoltagentErrorFromSdkError(
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
    // Return the created error instead of calling callback
    return voltagentErr;
  }

  generateText = async (
    options: GenerateTextOptions<LanguageModelV1>,
  ): Promise<ProviderTextResponse<GenerateTextResult<Record<string, any>, never>>> => {
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
      const voltagentErr = this._createVoltagentErrorFromSdkError(sdkError, "llm_generate"); // Use appropriate stage
      // Throw the standardized error
      throw voltagentErr;
    }
  };

  async streamText(
    options: StreamTextOptions<LanguageModelV1>,
  ): Promise<ProviderTextStreamResponse<StreamTextResult<Record<string, any>, never>>> {
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
        const voltagentErr = this._createVoltagentErrorFromSdkError(sdkError, "llm_stream");
        // Call the agent's onError callback if it exists
        if (options.onError) {
          options.onError(voltagentErr);
        }
      },
    });

    // Return only provider and textStream
    return {
      provider: result,
      textStream: result.textStream as any,
    };
  }

  generateObject = async <TSchema extends z.ZodType>(
    options: GenerateObjectOptions<LanguageModelV1, TSchema>,
  ): Promise<ProviderObjectResponse<GenerateObjectResult<z.infer<TSchema>>, z.infer<TSchema>>> => {
    const vercelMessages = options.messages.map(this.toMessage);

    // For object generation, we use onFinish as onStepFinish is not supported
    const onFinish = options.onStepFinish
      ? async (result: {
          object: z.infer<TSchema>;
          finishReason: FinishReason;
          usage: LanguageModelUsage;
          warnings: CallWarning[] | undefined;
          request: LanguageModelRequestMetadata;
          response: LanguageModelResponseMetadata;
          logprobs: any | undefined;
          providerMetadata: ProviderMetadata | undefined;
        }) => {
          if (options.onStepFinish) {
            const jsonResult =
              typeof result.object === "string" ? result.object : JSON.stringify(result.object);

            // Create a step with usage information directly passed
            const step = this.createStepFromChunk({
              type: "text",
              text: jsonResult,
              usage: result.usage,
            });

            if (step) await options.onStepFinish(step);
          }
        }
      : undefined;

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
      const voltagentErr = this._createVoltagentErrorFromSdkError(sdkError, "object_generate"); // Use appropriate stage
      // Throw the standardized error
      throw voltagentErr;
    }
  };

  async streamObject<TSchema extends z.ZodType>(
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
        if (step) await options.onStepFinish(step);
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
        const voltagentErr = this._createVoltagentErrorFromSdkError(sdkError, "object_stream");
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
}

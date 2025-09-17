import type {
  BaseMessage,
  GenerateObjectOptions,
  GenerateTextOptions,
  LLMProvider,
  ProviderObjectResponse,
  ProviderObjectStreamResponse,
  ProviderTextResponse,
  ProviderTextStreamResponse,
  StreamObjectFinishResult,
  StreamObjectOptions,
  StreamTextOptions,
  UsageInfo,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";
import type {
  CallWarning,
  FinishReason,
  GenerateObjectResult,
  GenerateTextResult,
  LanguageModelRequestMetadata,
  LanguageModelResponseMetadata,
  LanguageModelUsage,
  ModelMessage,
  ProviderMetadata,
  StepResult,
  StreamObjectOnFinishCallback,
  StreamObjectResult,
  StreamTextResult,
} from "ai";
import { generateObject, generateText, stepCountIs, streamObject, streamText } from "ai";
import { P, match } from "ts-pattern";
import type { SetRequired } from "type-fest";
import type { z } from "zod";
import {
  convertToolsForSDK,
  createMappedFullStream,
  createStepFromChunk,
  createVoltagentErrorFromSdkError,
} from "./utils";

// Type definitions for AI SDK v5
type AIGenerateTextParams = Parameters<typeof generateText>[0];
type AIModel = AIGenerateTextParams["model"];

export class VercelAIProvider implements LLMProvider<AIModel> {
  /**
   * Provider `generateText` implementation
   * @param options - The options for the generate text operation
   * @returns A standardized response for VoltAgent
   */
  public async generateText(
    options: GenerateTextOptions<AIModel>,
  ): Promise<ProviderTextResponse<GenerateTextResult<Record<string, any>, never>>> {
    const vercelMessages = options.messages.map(this.toMessage);
    const vercelTools = options.tools ? convertToolsForSDK(options.tools) : undefined;

    // Process onStepFinish if provided
    const onStepFinish = options.onStepFinish
      ? async (result: StepResult<Record<string, any>>) => {
          if (options.onStepFinish) {
            // Handle text response
            if (result.text) {
              const step = createStepFromChunk({
                type: "text",
                text: result.text,
                usage: result.usage,
              });
              if (step) await options.onStepFinish(step);
            }

            // Handle all tool calls - each as a separate step
            if (result.toolCalls && result.toolCalls.length > 0) {
              for (const toolCall of result.toolCalls) {
                const step = createStepFromChunk({
                  type: "tool-call",
                  toolCallId: toolCall.toolCallId,
                  toolName: toolCall.toolName,
                  input: toolCall.input,
                  usage: result.usage,
                });
                if (step) await options.onStepFinish(step);
              }
            }

            // Handle all tool results - each as a separate step
            if (result.toolResults && result.toolResults.length > 0) {
              for (const toolResult of result.toolResults) {
                const step = createStepFromChunk({
                  type: "tool-result",
                  toolCallId: toolResult.toolCallId,
                  toolName: toolResult.toolName,
                  output: toolResult.output,
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
        ...match(options.maxSteps)
          .with(P.number, (maxSteps) => ({ stopWhen: stepCountIs(maxSteps) }))
          .otherwise(() => ({})),
        ...match(options.provider?.maxTokens)
          .with(P.number, (maxTokens) => ({ maxOutputTokens: maxTokens }))
          .otherwise(() => ({})),
        abortSignal: options.signal,
        onStepFinish,
      });

      // Return standardized response
      return {
        provider: result,
        text: result.text || "",
        usage: getUsageInfo(result.usage),
        toolCalls: result.toolCalls,
        toolResults: result.toolResults,
        finishReason: result.finishReason,
        reasoning: Array.isArray(result.reasoning)
          ? result.reasoning.map((r) => r.text || "").join("\n")
          : result.reasoning,
        warnings: result.warnings,
      };
    } catch (sdkError) {
      const voltagentErr = createVoltagentErrorFromSdkError(sdkError, "llm_generate");
      throw voltagentErr;
    }
  }

  /**
   * Provider `streamText` implementation
   * @param options - The options for the stream text operation
   * @returns A standardized response for VoltAgent
   */
  public async streamText(
    options: StreamTextOptions<AIModel>,
  ): Promise<
    SetRequired<
      ProviderTextStreamResponse<StreamTextResult<Record<string, any>, never>>,
      "fullStream"
    >
  > {
    try {
      const vercelMessages = options.messages.map(this.toMessage);
      const vercelTools = options.tools ? convertToolsForSDK(options.tools) : undefined;

      // Process onStepFinish if provided
      const onStepFinish = options.onStepFinish
        ? async (result: StepResult<Record<string, any>>) => {
            if (options.onStepFinish) {
              // Handle text response
              if (result.text) {
                const step = createStepFromChunk({
                  type: "text",
                  text: result.text,
                  usage: result.usage,
                });
                if (step) await options.onStepFinish(step);
              }

              // Handle all tool calls - each as a separate step
              if (result.toolCalls && result.toolCalls.length > 0) {
                for (const toolCall of result.toolCalls) {
                  const step = createStepFromChunk({
                    type: "tool-call",
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    input: toolCall.input,
                    usage: result.usage,
                  });
                  if (step) await options.onStepFinish(step);
                }
              }

              // Handle all tool results - each as a separate step
              if (result.toolResults && result.toolResults.length > 0) {
                for (const toolResult of result.toolResults) {
                  const step = createStepFromChunk({
                    type: "tool-result",
                    toolCallId: toolResult.toolCallId,
                    toolName: toolResult.toolName,
                    output: toolResult.output,
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
        ...match(options.maxSteps)
          .with(P.number, (maxSteps) => ({ stopWhen: stepCountIs(maxSteps) }))
          .otherwise(() => ({})),
        ...match(options.provider?.maxTokens)
          .with(P.number, (maxTokens) => ({ maxOutputTokens: maxTokens }))
          .otherwise(() => ({})),
        abortSignal: options.signal,
        onStepFinish,
        onChunk: async ({ chunk }) => {
          if (options?.onChunk) {
            // Handle the chunk directly without usage tracking
            const step = createStepFromChunk(chunk);
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
                usage: getUsageInfo(result.usage),
                finishReason: result.finishReason,
                warnings: result.warnings,
                providerResponse: result,
              });
            }
          : undefined,
        onError: (sdkError) => {
          // Create the error using the helper
          const voltagentErr = createVoltagentErrorFromSdkError(sdkError, "llm_stream");
          // Call the agent's onError callback if it exists
          if (options.onError) {
            options.onError(voltagentErr);
          }
        },
      });

      // Return provider, textStream, fullStream, and Promise properties
      return {
        provider: result,
        textStream: result.textStream as any,
        fullStream: createMappedFullStream(result.fullStream),
        text: result.text,
        finishReason: result.finishReason,
        usage: result.usage as any, // fix me
        reasoning: result.reasoning.then
          ? result.reasoning.then((r) =>
              Array.isArray(r) ? r.map((p) => p.text || "").join("\n") : undefined,
            )
          : Promise.resolve(undefined),
      };
    } catch (error) {
      throw createVoltagentErrorFromSdkError(error, "llm_stream");
    }
  }

  /**
   * Provider `generateObject` implementation.
   * @param options - The options for the generate object operation
   * @returns A standardized response for VoltAgent
   */
  public async generateObject<TSchema extends z.ZodType>(
    options: GenerateObjectOptions<AIModel, TSchema>,
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
          const step = createStepFromChunk({
            type: "text",
            text: match(result.object)
              .with(P.string, (s) => s)
              .otherwise((o) => safeStringify(o)),
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
        schema: options.schema as any,
        ...match(options.provider?.maxTokens)
          .with(P.number, (maxTokens) => ({ maxOutputTokens: maxTokens }))
          .otherwise(() => ({})),
        abortSignal: options.signal,
      });

      // Call the custom onFinish handler if defined
      await onFinish?.({ ...result, logprobs: undefined });

      // Return standardized response
      return {
        provider: result,
        object: result.object as z.infer<TSchema>,
        usage: getUsageInfo(result.usage),
        finishReason: result.finishReason,
        warnings: result.warnings,
      };
    } catch (sdkError) {
      const voltagentErr = createVoltagentErrorFromSdkError(sdkError, "object_generate");
      throw voltagentErr;
    }
  }

  /**
   * Provider `streamObject` implementation
   * @param options - The options for the stream object operation
   * @returns The streamed object
   */
  public async streamObject<TSchema extends z.ZodType>(
    options: StreamObjectOptions<AIModel, TSchema>,
  ): Promise<
    ProviderObjectStreamResponse<
      StreamObjectResult<z.infer<TSchema>, unknown, never>,
      z.infer<TSchema>
    >
  > {
    const vercelMessages = options.messages.map(this.toMessage);
    const onFinish = match(options)
      .returnType<StreamObjectOnFinishCallback<z.infer<TSchema>> | null>()
      .with({ onStepFinish: P.not(P.nullish) }, (o) => {
        return async (event) => {
          const jsonResult = event.object ? safeStringify(event.object) : "";
          const step = createStepFromChunk({
            type: "text", // Simulate as a text step containing the final JSON
            text: jsonResult,
            usage: event.usage,
          });
          if (step) {
            await o.onStepFinish(step);
          }
        };
      })
      .with({ onFinish: P.not(P.nullish) }, (o) => {
        return async (event) => {
          const finishResult: StreamObjectFinishResult<z.infer<TSchema>> = {
            object: event.object,
            usage: getUsageInfo(event.usage), // Mapped usage info
            warnings: event.warnings,
            providerResponse: event, // Include the original SDK event object
            // finishReason is not typically available in Vercel's streamObject finish event
          };
          await o.onFinish(finishResult);
        };
      })
      .otherwise(() => null);

    const result = streamObject({
      ...options.provider,
      messages: vercelMessages,
      model: options.model,
      schema: options.schema as any,
      abortSignal: options.signal,
      ...match(options.provider?.maxTokens)
        .with(P.number, (maxTokens) => ({ maxOutputTokens: maxTokens }))
        .otherwise(() => ({})),
      ...match(onFinish)
        .with(P.not(P.nullish), (handler) => ({ onFinish: handler }))
        .otherwise(() => ({})),
      onError: (sdkError) => {
        // Create the error using the helper
        const voltagentErr = createVoltagentErrorFromSdkError(sdkError, "object_stream");
        // Call the agent's onError callback if it exists
        if (options.onError) {
          options.onError(voltagentErr);
        }
      },
    });

    // TODO: Add usage to the result - https://sdk.vercel.ai/docs/reference/ai-sdk-core/stream-object
    const partialObjectStream = result.partialObjectStream;
    // Return provider, objectStream, and Promise properties
    return {
      provider: { ...result, partialObjectStream } as any,
      objectStream: partialObjectStream as any,
      object: result.object as Promise<z.infer<TSchema>>,
      usage: result.usage.then(
        (u) => getUsageInfo(u) || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      ),
      warnings: result.warnings,
    };
  }

  /**
   * Get the model identifier
   * @param model - The model to get the identifier for
   * @returns The model identifier
   */
  public getModelIdentifier(model: AIModel): string {
    return typeof model === "string" ? model : model.modelId;
  }

  /**
   * Convert a VoltAgent message to a Vercel AI message
   * @param message - The VoltAgent message to convert
   * @returns The Vercel AI message
   */
  public toMessage(message: BaseMessage): ModelMessage {
    return message as ModelMessage;
  }
}

function getUsageInfo(usage?: LanguageModelUsage): UsageInfo | undefined {
  return match(usage)
    .with({ inputTokens: P.number, outputTokens: P.number, totalTokens: P.number }, (u) => ({
      promptTokens: u.inputTokens,
      completionTokens: u.outputTokens,
      totalTokens: u.totalTokens,
      cachedInputTokens: u.cachedInputTokens,
      reasoningTokens: u.reasoningTokens,
    }))
    .otherwise(() => undefined);
}

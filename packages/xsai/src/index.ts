import type {
  GenerateObjectOptions as BaseGenerateObjectOptions,
  BaseMessage,
  StreamObjectOptions as BaseStreamObjectOptions,
  StreamTextOptions as BaseStreamTextOptions,
  BaseTool,
  GenerateTextOptions,
  LLMProvider,
  MessageRole,
  ProviderObjectResponse,
  ProviderObjectStreamResponse,
  ProviderTextResponse,
  ProviderTextStreamResponse,
  StepWithContent,
} from "@voltagent/core";
import type {
  GenerateObjectResult,
  GenerateTextResult,
  GenerateTextStepResult,
  ImagePart,
  Message,
  StreamObjectResult,
  StreamTextResult,
  StreamTextStep,
  TextPart,
  ToolResult,
} from "xsai";
import type { z } from "zod";

export class XsAIProvider implements LLMProvider<string> {
  private apiKey: string;
  private baseURL: string;

  /**
   * Creates a new XsAIProvider instance
   * @param options - Configuration options
   * @param options.apiKey - The API key for authentication
   * @param options.baseURL - The base URL for API requests. Defaults to "https://api.openai.com/v1/"
   */
  constructor(options: { apiKey: string; baseURL?: string }) {
    this.apiKey = options.apiKey;
    this.baseURL = options.baseURL || "https://api.openai.com/v1/";
    // Bind methods to preserve 'this' context
    this.generateText = this.generateText.bind(this);
    this.streamText = this.streamText.bind(this);
    this.generateObject = this.generateObject.bind(this);
    this.streamObject = this.streamObject.bind(this);
    this.toMessage = this.toMessage.bind(this);
    this.convertTools = this.convertTools.bind(this);
    this.createStepFinishHandler = this.createStepFinishHandler.bind(this);
    this.getModelIdentifier = this.getModelIdentifier.bind(this);
  }

  getModelIdentifier = (model: string): string => {
    // The model itself is the string identifier for XsAIProvider
    return model;
  };

  toMessage = (message: BaseMessage): Message => {
    if (typeof message.content === "string") return message as Message;
    else if (Array.isArray(message.content)) {
      const content: (TextPart | ImagePart)[] = [];

      for (const part of message.content) {
        if (part.type === "text") {
          content.push(part as TextPart);
        } else if (part.type === "image") {
          if (typeof part.image === "string" || part.image instanceof URL) {
            content.push({
              type: "image_url",
              image_url: { url: part.image.toString() },
            } satisfies ImagePart);
          } else {
            console.warn(
              `[XsAIProvider] Message (role: ${message.role}) contained unsupported image part format...`,
            );
          }
        } else {
          console.warn(
            `[XsAIProvider] Message (role: ${message.role}) contained unsupported content parts...`,
          );
        }
      }

      return { role: message.role, content } as Message;
    } else {
      // Handle unexpected content types (null, undefined, etc.)
      console.warn(
        `[XsAIProvider] Unknown or unsupported content type for message (role: ${message.role}):`,
        message.content,
      );

      return { role: message.role, content: "" } as Message; // Fallback to empty string
    }
  };

  convertTools = async (tools: BaseTool[]): Promise<ToolResult[] | undefined> => {
    if (!tools || tools.length === 0) {
      return undefined;
    }

    const { tool } = await import("xsai");

    const functions = await Promise.all(
      tools.map(async (t) => {
        return await tool({
          name: t.name,
          description: t.description,
          parameters: t.parameters as any,
          execute: async (input) => {
            return await t.execute(input);
          },
        });
      }),
    );

    return functions;
  };

  createStepFinishHandler = (onStepFinish?: (step: StepWithContent) => void | Promise<void>) => {
    if (!onStepFinish) return undefined;

    return async (result: GenerateTextStepResult | StreamTextStep) => {
      // Handle text response
      if ("text" in result && result.text) {
        const step = {
          id: "",
          type: "text" as const,
          content: result.text,
          role: "assistant" as MessageRole,
          usage: {
            promptTokens: result.usage.prompt_tokens,
            completionTokens: result.usage.completion_tokens,
            totalTokens: result.usage.total_tokens,
          },
        };
        await onStepFinish(step);
      } else if ("choices" in result && result.choices?.[0]?.message?.content) {
        const step = {
          id: "",
          type: "text" as const,
          content: result.choices[0].message.content,
          role: "assistant" as MessageRole,
          usage: result.usage
            ? {
                promptTokens: result.usage.prompt_tokens,
                completionTokens: result.usage.completion_tokens,
                totalTokens: result.usage.total_tokens,
              }
            : undefined,
        };
        await onStepFinish(step);
      }

      // Handle tool calls
      if (result.toolCalls && result.toolCalls.length > 0) {
        for (const toolCall of result.toolCalls) {
          const step: StepWithContent = {
            id: toolCall.toolCallId,
            type: "tool_call" as const,
            name: toolCall.toolName,
            arguments: toolCall.args as any,
            content: JSON.stringify([
              {
                type: "tool-call",
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
                args: toolCall.args,
              },
            ]),
            role: "assistant" as MessageRole,
            usage: result.usage
              ? {
                  promptTokens: result.usage.prompt_tokens,
                  completionTokens: result.usage.completion_tokens,
                  totalTokens: result.usage.total_tokens,
                }
              : undefined,
          };
          await onStepFinish(step);
        }
      }

      // Handle tool results
      if (result.toolResults && result.toolResults.length > 0) {
        for (const toolResult of result.toolResults) {
          const step = {
            id: toolResult.toolCallId,
            type: "tool_result" as const,
            name: toolResult.toolName,
            result: toolResult.result,
            content: JSON.stringify([
              {
                type: "tool-result",
                toolCallId: toolResult.toolCallId,
                result: toolResult.result,
              },
            ]),
            role: "assistant" as MessageRole,
            usage: result.usage
              ? {
                  promptTokens: result.usage.prompt_tokens,
                  completionTokens: result.usage.completion_tokens,
                  totalTokens: result.usage.total_tokens,
                }
              : undefined,
          };
          await onStepFinish(step);
        }
      }
    };
  };

  generateText = async (
    options: GenerateTextOptions<string>,
  ): Promise<ProviderTextResponse<GenerateTextResult>> => {
    const { generateText } = await import("xsai");
    const xsaiMessages = options.messages.map(this.toMessage);
    const xsaiTools = (await this.convertTools(options.tools || [])) ?? [];

    const result = await generateText({
      apiKey: this.apiKey,
      messages: xsaiMessages,
      model: options.model,
      tools: xsaiTools,
      maxSteps: xsaiTools.length > 0 ? options.maxSteps : undefined,
      baseURL: this.baseURL,
      signal: options.signal,
      ...options.provider,
      onStepFinish: this.createStepFinishHandler(options.onStepFinish),
    });

    // Return standardized response
    return {
      provider: result,
      text: result.text || "", // Ensure text is always a string
      usage: result.usage
        ? {
            promptTokens: result.usage.prompt_tokens,
            completionTokens: result.usage.completion_tokens,
            totalTokens: result.usage.total_tokens,
          }
        : undefined,
      toolCalls: result.toolCalls,
      toolResults: result.toolResults,
      finishReason: result.finishReason,
    };
  };

  async streamText(
    options: BaseStreamTextOptions<string>,
  ): Promise<ProviderTextStreamResponse<StreamTextResult>> {
    const { streamText } = await import("xsai");
    const xsaiMessages = options.messages.map(this.toMessage);
    const xsaiTools = (await this.convertTools(options.tools || [])) || [];

    const result = await streamText({
      apiKey: this.apiKey,
      messages: xsaiMessages,
      model: options.model,
      tools: xsaiTools,
      maxSteps: xsaiTools.length > 0 ? options.maxSteps : undefined,
      baseURL: this.baseURL,
      signal: options.signal,
      streamOptions: {
        includeUsage: false,
      },
      ...options.provider,
      onStepFinish: this.createStepFinishHandler(options.onStepFinish),
      ...(options.onFinish
        ? {
            onFinish: async (result) =>
              await options.onFinish?.({
                text: result?.map((r) => r.choices?.[0]?.message?.content || "").join("") || "",
                ...result,
              }),
          }
        : {}),
    });

    // Return only provider and textStream - usage, toolCalls, etc. come in the stream
    return {
      provider: result,
      textStream: result.textStream,
    };
  }

  generateObject = async <TSchema extends z.ZodType>(
    options: BaseGenerateObjectOptions<string, TSchema>,
  ): Promise<ProviderObjectResponse<GenerateObjectResult<z.infer<TSchema>>, z.infer<TSchema>>> => {
    const { generateObject } = await import("xsai");
    const xsaiMessages = options.messages.map(this.toMessage);

    const onStepFinishWrapper = options.onStepFinish
      ? async (result: GenerateTextStepResult) => {
          // For generateObject, we need to wrap text content in a special format
          const handler = this.createStepFinishHandler(async (step) => {
            if (step.type === "text") {
              // Override the content format for text steps in generateObject
              const textStep = {
                ...step,
                content: JSON.stringify([
                  {
                    type: "text",
                    text: step.content,
                  },
                ]),
              };
              await options.onStepFinish?.(textStep);
            } else {
              await options.onStepFinish?.(step);
            }
          });

          if (handler) {
            handler(result);
          }
        }
      : undefined;

    const result = await generateObject({
      apiKey: this.apiKey,
      messages: xsaiMessages,
      model: options.model,
      schema: options.schema,
      baseURL: this.baseURL,
      signal: options.signal,
      ...options.provider,
      onStepFinish: onStepFinishWrapper,
    });

    // Return standardized response
    return {
      provider: result,
      object: result.object,
      usage: result.usage
        ? {
            promptTokens: result.usage.prompt_tokens,
            completionTokens: result.usage.completion_tokens,
            totalTokens: result.usage.total_tokens,
          }
        : undefined,
      finishReason: result.finishReason,
    };
  };

  async streamObject<TSchema extends z.ZodType>(
    options: BaseStreamObjectOptions<string, TSchema>,
  ): Promise<ProviderObjectStreamResponse<StreamObjectResult<z.infer<TSchema>>, z.infer<TSchema>>> {
    const { streamObject } = await import("xsai");
    const xsaiMessages = options.messages.map(this.toMessage);

    const onStepFinishWrapper = options.onStepFinish
      ? async (result: StreamTextStep) => {
          // For streamObject, we need to wrap text content in a special format
          const handler = this.createStepFinishHandler(async (step) => {
            if (step.type === "text") {
              // Override the content format for text steps in streamObject
              const textStep = {
                ...step,
                content: JSON.stringify(step.content),
              };
              await options.onStepFinish?.(textStep);
            } else {
              await options.onStepFinish?.(step);
            }
          });

          if (handler) {
            await handler(result);
          }

          if (options.onFinish) {
            await options.onFinish({
              object: result.choices?.[0]?.message?.content,
            });
          }
        }
      : undefined;

    const result = await streamObject({
      apiKey: this.apiKey,
      messages: xsaiMessages,
      model: options.model,
      schema: options.schema,
      baseURL: this.baseURL,
      signal: options.signal,
      ...options.provider,
      onStepFinish: onStepFinishWrapper,
    });

    // Create a ReadableStream for object chunks

    // Return only provider and objectStream - other data comes in the stream
    return {
      provider: result,
      objectStream: result.partialObjectStream,
    };
  }
}

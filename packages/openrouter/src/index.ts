import { createOpenRouter } from "@openrouter/ai-sdk-provider";
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
  StreamObjectOptions,
  StreamTextOptions,
} from "@voltagent/core";
import { createAsyncIterableStream } from "@voltagent/core";
import { generateObject, generateText, streamObject, streamText } from "ai";
import type { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import type { OpenRouterProviderOptions } from "./types";
import { convertToolsForSDK } from "./utils";

export class OpenRouterProvider implements LLMProvider<string> {
  private openrouter: ReturnType<typeof createOpenRouter>;

  constructor(private options?: OpenRouterProviderOptions) {
    this.openrouter = createOpenRouter({
      apiKey: this.options?.apiKey || process.env.OPENROUTER_API_KEY,
      baseURL: this.options?.baseURL,
      headers: {
        ...(this.options?.httpReferer && {
          "HTTP-Referer": this.options.httpReferer,
        }),
        ...(this.options?.xTitle && { "X-Title": this.options.xTitle }),
      },
    });

    // Bind methods to preserve 'this' context
    this.generateText = this.generateText.bind(this);
    this.streamText = this.streamText.bind(this);
    this.generateObject = this.generateObject.bind(this);
    this.streamObject = this.streamObject.bind(this);
    this.toMessage = this.toMessage.bind(this);
    this.createStepFromChunk = this.createStepFromChunk.bind(this);
    this.getModelIdentifier = this.getModelIdentifier.bind(this);
  }

  getModelIdentifier = (model: string): string => {
    return model;
  };

  toMessage = (message: BaseMessage): any => {
    // Determine the content first
    let content: string | Array<any>;
    if (typeof message.content === "string") {
      content = message.content;
    } else if (Array.isArray(message.content)) {
      const mappedParts: Array<any> = [];
      for (const part of message.content) {
        if (part.type === "text" && typeof part.text === "string") {
          mappedParts.push({ type: "text", text: part.text });
        } else if (
          part.type === "image" &&
          part.image &&
          part.mimeType &&
          typeof part.image === "string" &&
          typeof part.mimeType === "string"
        ) {
          // Handle potential data URI in image string
          const imageUrl = part.image.startsWith("data:")
            ? part.image
            : `data:${part.mimeType};base64,${part.image}`;
          mappedParts.push({
            type: "image_url",
            image_url: {
              url: imageUrl,
            },
          });
        } else {
          console.warn(
            `[OpenRouterProvider] Unsupported or incomplete part type in array: ${part.type}. Skipping.`,
          );
        }
      }
      content = mappedParts.length > 0 ? mappedParts : ""; // Use empty string if array resulted in no parts
    } else {
      console.warn(
        "[OpenRouterProvider] Unknown or unsupported content type for message:",
        message.content,
      );
      content = "";
    }

    // Helper function to ensure content is string when needed
    const ensureStringContent = (
      currentContent: string | Array<any>,
      roleForWarning: string,
    ): string => {
      if (typeof currentContent === "string") {
        return currentContent || "";
      }
      // If it's an array, convert it to a string representation for roles that require it.
      console.warn(
        `[OpenRouterProvider] ${roleForWarning} message content must be a string for OpenRouter. Converting array content to string representation.`,
      );
      return (
        currentContent
          .map((p) => {
            if (p && typeof p === "object" && "text" in p) {
              return p.text;
            }
            return String(p);
          })
          .join(" ") || ""
      );
    };

    const baseMsg: any = {
      role: message.role as MessageRole,
    };

    switch (message.role) {
      case "system":
        return {
          ...baseMsg,
          content: ensureStringContent(content, "System"),
        };

      case "user":
        return {
          ...baseMsg,
          content: content || "",
        };

      case "assistant":
        const assistantMsg: any = {
          ...baseMsg,
          content: ensureStringContent(content, "Assistant"),
        };

        // Handle tool calls if present
        if ((message as any).toolCalls && (message as any).toolCalls.length > 0) {
          assistantMsg.tool_calls = (message as any).toolCalls.map((toolCall: any) => ({
            id: toolCall.toolCallId,
            type: "function",
            function: {
              name: toolCall.toolName,
              arguments: JSON.stringify(toolCall.args),
            },
          }));
        }

        return assistantMsg;

      case "tool":
        return {
          tool_call_id: (message as any).toolCallId,
          role: "tool",
          content: ensureStringContent(content, "Tool"),
        };

      default:
        console.warn(`[OpenRouterProvider] Unknown message role: ${message.role}`);
        return { role: "user", content: content || "" };
    }
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
    if (chunk.type === "tool-call" && chunk.toolCallId) {
      return {
        id: chunk.toolCallId,
        type: "tool_call",
        content: JSON.stringify([
          {
            type: "tool-call",
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            args: chunk.args,
          },
        ]),
        name: chunk.toolName,
        role: "assistant" as MessageRole,
        arguments: chunk.args,
        usage: chunk.usage || undefined,
      };
    }
    if (chunk.type === "tool-result" && chunk.toolCallId) {
      return {
        id: chunk.toolCallId,
        type: "tool_result",
        content: JSON.stringify([
          {
            type: "tool-result",
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            result: chunk.result,
          },
        ]),
        name: chunk.toolName,
        role: "tool" as MessageRole,
        arguments: chunk.args,
        result: chunk.result,
        usage: chunk.usage || undefined,
      };
    }
    return null;
  };

  generateText = async (
    options: GenerateTextOptions<string>,
  ): Promise<ProviderTextResponse<any>> => {
    try {
      const openrouterMessages = options.messages.map(this.toMessage);
      const openrouterTools = options.tools ? convertToolsForSDK(options.tools) : undefined;

      // Extract common parameters
      const {
        temperature = 0.7,
        maxTokens,
        topP,
        frequencyPenalty,
        presencePenalty,
        stopSequences,
      } = options.provider || {};

      // Create the model using the OpenRouter provider
      const model = this.openrouter(options.model);

      // Call OpenRouter API using the AI SDK's generateText function
      const response = await generateText({
        model,
        messages: openrouterMessages,
        temperature,
        maxTokens,
        topP,
        frequencyPenalty,
        presencePenalty,
        tools: openrouterTools,
        stop: stopSequences,
      });

      // Extract usage information
      const usage = response.usage
        ? {
            promptTokens: response.usage.promptTokens,
            completionTokens: response.usage.completionTokens,
            totalTokens: response.usage.totalTokens,
          }
        : undefined;

      // Extract tool calls and results from the response
      const toolCalls = response.toolCalls;
      const toolResults = [];

      if (toolCalls && toolCalls.length > 0 && options && options.tools) {
        for (const toolCall of toolCalls) {
          // Handle all tool calls - each as a separate step
          const step = this.createStepFromChunk({
            type: "tool-call",
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            args: toolCall.args,
            usage: usage,
          });
          if (step && options.onStepFinish) await options.onStepFinish(step);
          //Call the function with the arguments
          const functionName = toolCall.toolName;
          const functionToCall = options.tools.find(
            (toolItem) => functionName === toolItem.name,
          )?.execute;
          const functionArgs = toolCall.args;
          if (functionToCall === undefined) {
            throw `Function ${functionName} not found in tools`;
          }
          const functionResponse = await functionToCall(functionArgs);
          if (functionResponse === undefined) {
            throw `Function ${functionName} returned undefined`;
          }
          toolResults.push({
            toolCallId: toolCall.toolCallId,
            name: functionName,
            output: functionResponse,
          });

          openrouterMessages.push({
            tool_call_id: toolCall.toolCallId,
            role: "tool",
            content: JSON.stringify(functionResponse),
          });
        }
        // Handle all tool results - each as a separate step
        if (toolCalls && toolResults && toolResults.length > 0) {
          for (const toolResult of toolResults) {
            const step = this.createStepFromChunk({
              type: "tool-result",
              toolCallId: toolResult.toolCallId,
              toolName: toolResult.name,
              result: toolResult.output,
              usage: usage,
            });
            if (step && options.onStepFinish) await options.onStepFinish(step);
          }
        }

        // Call OpenRouter API again with tool results
        const secondResponse = await this.openrouter.generateText({
          model: options.model,
          messages: openrouterMessages,
          temperature,
          maxTokens,
          topP,
          frequencyPenalty,
          presencePenalty,
          tools: openrouterTools,
          stop: stopSequences,
        });

        // Create step from final response
        const responseText = secondResponse.text || "";
        const textStep = this.createStepFromChunk({
          type: "text",
          text: responseText,
          usage: secondResponse.usage
            ? {
                promptTokens: secondResponse.usage.promptTokens,
                completionTokens: secondResponse.usage.completionTokens,
                totalTokens: secondResponse.usage.totalTokens,
              }
            : undefined,
        });
        if (textStep && options.onStepFinish) await options.onStepFinish(textStep);

        return {
          provider: secondResponse,
          text: responseText,
          usage: secondResponse.usage
            ? {
                promptTokens: secondResponse.usage.promptTokens,
                completionTokens: secondResponse.usage.completionTokens,
                totalTokens: secondResponse.usage.totalTokens,
              }
            : undefined,
          toolCalls: toolCalls?.map((tc: any) => ({
            type: "tool-call",
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            args: tc.args,
          })),
          toolResults: toolResults,
        };
      } else {
        // No tool calls, simple response
        const responseText = response.text || "";
        const textStep = this.createStepFromChunk({
          type: "text",
          text: responseText,
          usage: usage,
        });
        if (textStep && options.onStepFinish) await options.onStepFinish(textStep);

        return {
          provider: response,
          text: responseText,
          usage: usage,
        };
      }
    } catch (error) {
      console.error("[OpenRouterProvider] Error generating text:", error);
      throw error;
    }
  };

  streamText = async (
    options: StreamTextOptions<string>,
  ): Promise<ProviderTextStreamResponse<any>> => {
    // Note: For now, implement streaming as a simple async iterator that yields the final result
    // This could be improved to use actual streaming in the future
    const result = await this.generateText(options);

    return {
      provider: result.provider,
      textStream: createAsyncIterableStream([
        this.createStepFromChunk({
          type: "text",
          text: result.text,
          usage: result.usage,
        }) as StepWithContent,
      ]),
    };
  };

  generateObject = async <T = any>(
    options: GenerateObjectOptions<string, z.ZodSchema<T>>,
  ): Promise<ProviderObjectResponse<T, any>> => {
    try {
      const openrouterMessages = options.messages.map(this.toMessage);
      const schema = zodToJsonSchema(options.schema);

      // Extract common parameters
      const {
        temperature = 0.7,
        maxTokens,
        topP,
        frequencyPenalty,
        presencePenalty,
        stopSequences,
      } = options.provider || {};

      // Create the model using the OpenRouter provider
      const model = this.openrouter(options.model);

      // Call OpenRouter API using the AI SDK's generateObject function
      const response = await generateObject({
        model,
        messages: openrouterMessages,
        schema: options.schema,
        temperature,
        maxTokens,
        topP,
        frequencyPenalty,
        presencePenalty,
        stop: stopSequences,
      });

      return {
        object: response.object,
        usage: response.usage
          ? {
              promptTokens: response.usage.promptTokens,
              completionTokens: response.usage.completionTokens,
              totalTokens: response.usage.totalTokens,
            }
          : undefined,
        provider: "openrouter",
        metadata: {
          model: options.model,
          provider: "openrouter",
        },
      };
    } catch (error) {
      console.error("[OpenRouterProvider] Error generating object:", error);
      throw error;
    }
  };

  streamObject = async <T = any>(
    options: StreamObjectOptions<string, z.ZodSchema<T>>,
  ): Promise<ProviderObjectStreamResponse<T, any>> => {
    // Note: For now, implement streaming as a simple async iterator that yields the final result
    // This could be improved to use actual streaming in the future
    const result = await this.generateObject(options);

    return {
      provider: result.provider,
      objectStream: createAsyncIterableStream([result.object]),
    };
  };
}

export type { OpenRouterProviderOptions } from "./types";
export default OpenRouterProvider;

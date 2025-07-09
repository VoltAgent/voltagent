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
import type { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { OpenRouterMessage, OpenRouterProviderOptions } from "./types";
import { convertToolsForSDK } from "./utils";

export class OpenRouterProvider implements LLMProvider<string> {
  private apiKey: string;
  private baseURL: string;
  private httpReferer?: string;
  private xTitle?: string;

  constructor(private options?: OpenRouterProviderOptions) {
    this.apiKey = this.options?.apiKey || process.env.OPENROUTER_API_KEY!;
    this.baseURL = this.options?.baseURL || "https://openrouter.ai/api/v1";
    this.httpReferer = this.options?.httpReferer;
    this.xTitle = this.options?.xTitle;

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

  toMessage = (message: BaseMessage): OpenRouterMessage => {
    // Helper function to ensure content is string when needed
    const ensureStringContent = (content: any): string => {
      if (typeof content === "string") {
        return content;
      }
      if (Array.isArray(content)) {
        return content
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join(" ");
      }
      return String(content || "");
    };

    const baseMsg: any = {
      role: message.role as MessageRole,
    };

    switch (message.role) {
      case "system":
        return {
          ...baseMsg,
          content: ensureStringContent(message.content),
        };

      case "user":
        return {
          ...baseMsg,
          content: ensureStringContent(message.content),
        };

      case "assistant":
        const assistantMsg: any = {
          ...baseMsg,
          content: ensureStringContent(message.content),
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
          role: "tool",
          tool_call_id: (message as any).toolCallId,
          name: (message as any).toolName,
          content: ensureStringContent(message.content),
        };

      default:
        console.warn(`[OpenRouterProvider] Unknown message role: ${message.role}`);
        return {
          role: message.role as any,
          content: ensureStringContent(message.content),
        };
    }
  };

  createStepFromChunk = (chunk: any): StepWithContent | null => {
    try {
      if (chunk.type === "text" && chunk.text) {
        return {
          id: "",
          type: "text",
          content: chunk.text,
          role: "assistant" as MessageRole,
          usage: chunk.usage,
        };
      }

      if (chunk.type === "tool_call") {
        return {
          id: "",
          type: "tool_call",
          content: JSON.stringify({
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            args: chunk.args,
          }),
          role: "assistant" as MessageRole,
          usage: chunk.usage,
        };
      }

      if (chunk.type === "tool_result") {
        return {
          id: "",
          type: "tool_result",
          content: JSON.stringify({
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            result: chunk.result,
          }),
          role: "tool" as MessageRole,
          usage: chunk.usage,
        };
      }

      return null;
    } catch (error) {
      console.warn("[OpenRouterProvider] Error creating step from chunk:", error);
      return null;
    }
  };

  private createFlatJsonSchema(zodSchema: z.ZodType): any {
    try {
      const schema = zodToJsonSchema(zodSchema);
      return schema;
    } catch (error) {
      console.warn("[OpenRouterProvider] Error converting schema:", error);
      return { type: "object", properties: {}, additionalProperties: false };
    }
  }

  async generateText(options: GenerateTextOptions<string>): Promise<ProviderTextResponse<any>> {
    try {
      const messages = options.messages.map(this.toMessage);

      // Extract parameters
      const {
        temperature = 0.7,
        maxTokens = 1000,
        topP = 1.0,
        frequencyPenalty = 0,
        presencePenalty = 0,
        stopSequences,
      } = options.provider || {};

      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      };

      if (this.httpReferer) {
        headers["HTTP-Referer"] = this.httpReferer;
      }

      if (this.xTitle) {
        headers["X-Title"] = this.xTitle;
      }

      // Prepare request body
      const body: any = {
        model: options.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        stop: stopSequences,
      };

      // Add tools if provided
      if (options.tools && options.tools.length > 0) {
        body.tools = options.tools.map((tool) => {
          const parameters = tool.parameters
            ? this.createFlatJsonSchema(tool.parameters)
            : { type: "object", properties: {}, additionalProperties: false };

          return {
            type: "function",
            function: {
              name: tool.name,
              description: tool.description,
              parameters,
            },
          };
        });
        body.tool_choice = "auto";
      }

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const data: any = await response.json();
      const choice = data.choices?.[0];
      if (!choice) {
        throw new Error("No response from OpenRouter API");
      }

      const usage = data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined;

      // Handle tool calls if present
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        const updatedMessages = [
          ...messages,
          {
            role: "assistant" as const,
            content: choice.message.content || "",
            tool_calls: choice.message.tool_calls,
          },
        ];

        // Execute all tool calls
        for (const toolCall of choice.message.tool_calls) {
          try {
            const tool = options.tools?.find((t) => t.name === toolCall.function.name);
            if (!tool) {
              throw new Error(`Tool ${toolCall.function.name} not found`);
            }

            const toolArgs = JSON.parse(toolCall.function.arguments);
            const toolResult = await tool.execute(toolArgs);

            updatedMessages.push({
              role: "tool" as const,
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify(toolResult),
            });

            if (options.onStepFinish) {
              const toolStep = this.createStepFromChunk({
                type: "tool-call",
                toolCallType: "function",
                toolCallId: toolCall.id,
                toolName: toolCall.function.name,
                args: toolArgs,
                result: toolResult,
                usage,
              });
              if (toolStep) await options.onStepFinish(toolStep);
            }
          } catch (error) {
            console.error(
              `[OpenRouterProvider] Tool execution error for ${toolCall.function.name}:`,
              error,
            );

            updatedMessages.push({
              role: "tool" as const,
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
            });
          }
        }

        // Make follow-up API call with tool results
        const followUpResponse = await fetch(`${this.baseURL}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: options.model,
            messages: updatedMessages,
            temperature,
            max_tokens: maxTokens,
            top_p: topP,
            frequency_penalty: frequencyPenalty,
            presence_penalty: presencePenalty,
            stop: stopSequences,
          }),
        });

        if (!followUpResponse.ok) {
          const errorText = await followUpResponse.text();
          throw new Error(
            `OpenRouter follow-up error: ${followUpResponse.status} ${followUpResponse.statusText} - ${errorText}`,
          );
        }

        const followUpData: any = await followUpResponse.json();
        const followUpChoice = followUpData.choices?.[0];

        if (!followUpChoice) {
          throw new Error("No response from OpenRouter API follow-up call");
        }

        const totalUsage = followUpData.usage
          ? {
              promptTokens: (usage?.promptTokens || 0) + followUpData.usage.prompt_tokens,
              completionTokens:
                (usage?.completionTokens || 0) + followUpData.usage.completion_tokens,
              totalTokens: (usage?.totalTokens || 0) + followUpData.usage.total_tokens,
            }
          : usage;

        if (options.onStepFinish) {
          if (followUpChoice.message.content) {
            const textStep = this.createStepFromChunk({
              type: "text",
              text: followUpChoice.message.content,
              usage: totalUsage,
            });
            if (textStep) await options.onStepFinish(textStep);
          }
        }

        return {
          provider: followUpData,
          text: followUpChoice.message?.content || "",
          usage: totalUsage,
          finishReason: followUpChoice.finish_reason,
        };
      }

      // Handle non-tool responses
      if (options.onStepFinish) {
        if (choice.message.content) {
          const textStep = this.createStepFromChunk({
            type: "text",
            text: choice.message.content,
            usage,
          });
          if (textStep) await options.onStepFinish(textStep);
        }
      }

      return {
        provider: data,
        text: choice.message?.content || "",
        usage,
        finishReason: choice.finish_reason,
      };
    } catch (error) {
      console.error("[OpenRouterProvider] generateText error:", error);
      throw error;
    }
  }

  async streamText(options: StreamTextOptions<string>): Promise<ProviderTextStreamResponse<any>> {
    try {
      const messages = options.messages.map(this.toMessage);

      // Extract parameters
      const {
        temperature = 0.7,
        maxTokens = 1000,
        topP = 1.0,
        frequencyPenalty = 0,
        presencePenalty = 0,
        stopSequences,
      } = options.provider || {};

      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      };

      if (this.httpReferer) {
        headers["HTTP-Referer"] = this.httpReferer;
      }

      if (this.xTitle) {
        headers["X-Title"] = this.xTitle;
      }

      // Prepare request body
      const body: any = {
        model: options.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        stop: stopSequences,
        stream: true,
      };

      // Add tools if provided
      if (options.tools && options.tools.length > 0) {
        const convertedTools = convertToolsForSDK(options.tools);
        if (convertedTools) {
          body.tools = convertedTools;
          body.tool_choice = "auto";
        }
      }

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      let accumulatedText = "";
      let usage:
        | {
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
          }
        | undefined;

      // Create a readable stream to return to the caller
      const textStream = createAsyncIterableStream(
        new ReadableStream({
          async start(controller) {
            try {
              if (!response.body) {
                throw new Error("No response body from OpenRouter API");
              }

              const reader = response.body.getReader();
              const decoder = new TextDecoder();

              while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");

                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    const data = line.slice(6);
                    if (data === "[DONE]") continue;

                    try {
                      const parsed = JSON.parse(data);
                      const content = parsed.choices?.[0]?.delta?.content || "";

                      if (content) {
                        accumulatedText += content;
                        controller.enqueue(content);

                        // Call onChunk with text chunk
                        if (options.onChunk) {
                          const step = {
                            id: "",
                            type: "text" as const,
                            content,
                            role: "assistant" as MessageRole,
                          };
                          await options.onChunk(step);
                        }
                      }

                      if (parsed.usage) {
                        usage = {
                          promptTokens: parsed.usage.prompt_tokens,
                          completionTokens: parsed.usage.completion_tokens,
                          totalTokens: parsed.usage.total_tokens,
                        };
                      }
                    } catch (parseError) {
                      console.warn(
                        "[OpenRouterProvider] Error parsing streaming chunk:",
                        parseError,
                      );
                    }
                  }
                }
              }

              // When stream completes, close the controller
              controller.close();

              // Call onFinish with complete result
              if (options.onFinish) {
                await options.onFinish({
                  text: accumulatedText,
                });
              }

              // Call onStepFinish with complete result if provided
              if (options.onStepFinish) {
                if (accumulatedText) {
                  const textStep = {
                    id: "",
                    type: "text" as const,
                    content: accumulatedText,
                    role: "assistant" as MessageRole,
                    usage,
                  };
                  await options.onStepFinish(textStep);
                }
              }
            } catch (error) {
              // Handle errors during streaming
              console.error("[OpenRouterProvider] Error during stream processing:", error);
              controller.error(error);

              if (options.onError) options.onError(error as any);
            }
          },
        }),
      );

      // Return provider and text stream
      return {
        provider: response,
        textStream,
      };
    } catch (error) {
      console.error("[OpenRouterProvider] streaming API error:", error);

      if (options.onError) options.onError(error as any);
      throw error;
    }
  }

  async generateObject<TSchema extends z.ZodType>(
    options: GenerateObjectOptions<string, TSchema>,
  ): Promise<ProviderObjectResponse<any, z.infer<TSchema>>> {
    try {
      const messages = options.messages.map(this.toMessage);

      // Add system message instructing to generate JSON following the schema
      const schemaDescription =
        JSON.stringify(zodToJsonSchema(options.schema)) ||
        "Respond with a JSON object according to the specified schema.";
      const systemMessage = {
        role: "system",
        content: `Schema: ${schemaDescription} \n Respond with ONLY a valid JSON object, nothing else.`,
      };

      // Extract common parameters
      const {
        temperature = 0.2, // Lower temperature for more deterministic JSON generation
        maxTokens,
        topP,
      } = options.provider || {};

      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      };

      if (this.httpReferer) {
        headers["HTTP-Referer"] = this.httpReferer;
      }

      if (this.xTitle) {
        headers["X-Title"] = this.xTitle;
      }

      // Call OpenRouter API
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: options.model,
          messages: [systemMessage, ...messages],
          temperature,
          max_tokens: maxTokens,
          top_p: topP,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const data = await response.json();

      // Parse JSON response
      let parsedObject: z.infer<TSchema>;
      try {
        const content = data.choices[0].message.content || "{}";
        const rawObject = JSON.parse(content);
        parsedObject = options.schema.parse(rawObject);
      } catch (parseError: any) {
        console.error("[OpenRouterProvider] Error parsing JSON from response:", parseError);
        throw new Error(`Failed to parse JSON response: ${parseError.message}`);
      }

      // Extract usage information
      const usage = data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined;

      // Call onStepFinish if provided
      if (options.onStepFinish) {
        const step = {
          id: "",
          type: "text" as const,
          content: JSON.stringify(parsedObject, null, 2),
          role: "assistant" as MessageRole,
          usage,
        };
        await options.onStepFinish(step);
      }

      // Return standardized response
      return {
        provider: data,
        object: parsedObject,
        usage,
        finishReason: data.choices[0].finish_reason,
      };
    } catch (error) {
      console.error("[OpenRouterProvider] generateObject API error:", error);
      throw error;
    }
  }

  async streamObject<TSchema extends z.ZodType>(
    options: StreamObjectOptions<string, TSchema>,
  ): Promise<ProviderObjectStreamResponse<any, z.infer<TSchema>>> {
    // For now, fall back to generateObject since streaming object is complex
    // This could be enhanced in the future to support true streaming
    try {
      const result = await this.generateObject(options);

      // Create a simple stream that emits the complete object
      const objectStream = createAsyncIterableStream(
        new ReadableStream({
          start(controller) {
            controller.enqueue(JSON.stringify(result.object));
            controller.close();
          },
        }),
      );

      return {
        provider: result.provider,
        objectStream,
      };
    } catch (error) {
      console.error("[OpenRouterProvider] streamObject API error:", error);
      if (options.onError) options.onError(error as any);
      throw error;
    }
  }
}

export default OpenRouterProvider;
export * from "./types";

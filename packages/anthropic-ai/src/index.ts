import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlock, Message, Usage } from "@anthropic-ai/sdk/resources/messages";
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
  VoltAgentError,
} from "@voltagent/core";
import type { z } from "zod";
import type {
  AnthropicMessage,
  AnthropicProviderOptions,
  AnthropicToolCall,
  StopMessageChunk,
} from "./types";
import { coreToolToAnthropic } from "./utils";

export class AnthropicProvider implements LLMProvider<string> {
  private anthropic: Anthropic;
  private model: string;

  constructor(options: AnthropicProviderOptions = {}) {
    //mock client for tests
    this.anthropic =
      options.client ?? new Anthropic({ apiKey: options.apiKey ?? process.env.ANTHROPIC_API_KEY });
    this.model = "claude-3-7-sonnet-20250219";

    this.createStepFromChunk = this.createStepFromChunk.bind(this);
    this.getModelIdentifier = this.getModelIdentifier.bind(this);
    this.toMessage = this.toMessage.bind(this);
    this.generateText = this.generateText.bind(this);
    this.streamText = this.streamText.bind(this);
    this.generateObject = this.generateObject.bind(this);
    this.streamObject = this.streamObject.bind(this);
  }

  getModelIdentifier(model: string): string {
    return model;
  }

  toMessage = (message: BaseMessage): AnthropicMessage => {
    return message as AnthropicMessage;
  };

  createStepFromChunk = (chunk: { type: string; [key: string]: any }): StepWithContent | null => {
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

  private processResponseContent(content: ContentBlock[]): {
    responseText: string;
    toolCalls: AnthropicToolCall[];
  } {
    let responseText = "";
    const toolCalls: AnthropicToolCall[] = [];

    if (!content || content.length === 0) {
      return { responseText, toolCalls };
    }

    for (const item of content) {
      if (item.type === "text") {
        responseText += item.text;
      } else if (item.type === "tool_use") {
        toolCalls.push({
          type: "tool-call",
          toolCallId: item.id,
          toolName: item.name,
          args: item.input || {},
        });
      }
    }

    return { responseText, toolCalls };
  }

  private async handleStepFinish(
    options: GenerateTextOptions<string>,
    responseText: string,
    toolCalls: AnthropicToolCall[],
    usage?: Usage,
  ): Promise<void> {
    if (!options.onStepFinish) return;

    if (responseText) {
      const step = this.createStepFromChunk({
        type: "text",
        text: responseText,
        usage,
      });
      if (step) await options.onStepFinish(step);
    }

    for (const toolCall of toolCalls) {
      const step = this.createStepFromChunk({
        type: "tool-call",
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        args: toolCall.args,
        usage,
      });
      if (step) await options.onStepFinish(step);
    }
  }

  private createResponseObject(
    response: Message,
    responseText: string,
    toolCalls: AnthropicToolCall[],
  ): ProviderTextResponse<any> {
    return {
      provider: response,
      text: responseText,
      usage: response.usage
        ? {
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens,
            totalTokens: response.usage.input_tokens + response.usage.output_tokens,
          }
        : undefined,
      toolCalls: toolCalls,
      finishReason: response.stop_reason as string,
    };
  }

  async generateText(options: GenerateTextOptions<string>): Promise<ProviderTextResponse<any>> {
    try {
      const anthropicMessages = options.messages.map(this.toMessage);
      const anthropicTools = options.tools ? coreToolToAnthropic(options.tools) : undefined;

      const response = await this.anthropic.messages.create({
        messages: anthropicMessages,
        model: this.model,
        max_tokens: options.provider?.maxTokens ?? 1024,
        temperature: options.provider?.temperature ?? 0.7,
        top_p: options.provider?.topP,
        stop_sequences: options.provider?.stopSequences,
        stream: false,
        tools: anthropicTools,
      });

      //Processes the response content
      const { responseText, toolCalls } = this.processResponseContent(response.content);

      //Adds tool calls to the messages if there are any
      if (toolCalls.length > 0) {
        anthropicMessages.push({
          role: "assistant",
          content: "",
          tool_calls: toolCalls,
        });
      }

      //Handles onStepFinish
      await this.handleStepFinish(options, responseText, toolCalls, response.usage);

      return this.createResponseObject(response, responseText, toolCalls);
    } catch (error) {
      console.error("Anthropic API error:", error);
      return { error: String(error) } as any;
    }
  }

  async streamText(options: StreamTextOptions<string>): Promise<ProviderTextStreamResponse<any>> {
    try {
      const anthropicMessages = options.messages.map(this.toMessage);
      const anthropicTools = options.tools ? coreToolToAnthropic(options.tools) : undefined;

      const { temperature = 0.7, maxTokens = 1024, topP, stopSequences } = options.provider || {};

      const response = await this.anthropic.messages.create({
        messages: anthropicMessages,
        model: options.model || this.model,
        max_tokens: maxTokens,
        temperature: temperature,
        top_p: topP,
        stop_sequences: stopSequences,
        stream: true,
        tools: anthropicTools,
      });

      const textStream = new ReadableStream({
        start: async (controller) => {
          try {
            let currentText = "";
            const currentToolCalls: AnthropicToolCall[] = [];

            for await (const chunk of response) {
              if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
                currentText += chunk.delta.text;

                const textChunk = this.createStepFromChunk({
                  type: "text",
                  text: chunk.delta.text,
                  usage: undefined,
                });

                controller.enqueue(chunk.delta.text);

                if (textChunk) {
                  if (options.onChunk) {
                    options.onChunk(textChunk);
                  }

                  if (options.onStepFinish) {
                    options.onStepFinish(textChunk);
                  }
                }
              }

              if (
                chunk.type === "content_block_start" &&
                chunk.content_block?.type === "tool_use"
              ) {
                const toolBlock = chunk.content_block;
                const toolCall: AnthropicToolCall = {
                  type: "tool-call",
                  toolCallId: toolBlock.id,
                  toolName: toolBlock.name,
                  args: toolBlock.input || {},
                };

                currentToolCalls.push(toolCall);

                // Handle onChunk callback for tool call
                if (options?.onChunk) {
                  const step = this.createStepFromChunk(toolCall);
                  if (step) await options.onChunk(step);
                }

                // Handle onStepFinish for tool call
                if (options.onStepFinish) {
                  const step = this.createStepFromChunk(toolCall);
                  if (step) await options.onStepFinish(step);
                }
              }

              // Handle message completion
              if (chunk.type === "message_stop") {
                const stopChunk = chunk as StopMessageChunk;
                // Call onFinish with the final result
                if (options.onFinish) {
                  const finalResult = {
                    text: currentText,
                    toolCalls: currentToolCalls.map((call) => ({
                      usage: stopChunk.message.usage,
                      ...call,
                    })),
                    toolResults: [],
                    finishReason: "stop",
                  };

                  await options.onFinish(finalResult);
                }

                // Close the stream
                controller.close();
              }
            }
          } catch (error) {
            const voltError: VoltAgentError = {
              message: "Error while parsing streamed text response from Anthropic API",
              originalError: error,
            };
            // Handle errors
            if (options.onError) {
              options.onError(voltError);
            }
            controller.error(voltError);
          }
        },
      });

      return {
        provider: response,
        textStream: textStream,
      };
    } catch (error) {
      const voltError: VoltAgentError = {
        message: "Error generating streaming text in Anthropic API",
        originalError: error,
      };
      //Handles Api Errors
      if (options.onError) {
        options.onError(voltError);
      }
      console.error("Anthropic API error:", error);
      throw voltError;
    }
  }

  async generateObject<TSchema extends z.ZodType>(
    options: GenerateObjectOptions<string, TSchema>,
  ): Promise<ProviderObjectResponse<any, z.infer<TSchema>>> {
    const { temperature = 0.2, maxTokens = 1024, topP, stopSequences } = options.provider || {};

    const anthropicMessages = options.messages.map(this.toMessage);

    try {
      const response = await this.anthropic.messages.create({
        messages: anthropicMessages,
        model: options.model || this.model,
        max_tokens: maxTokens,
        temperature: temperature,
        top_p: topP,
        stop_sequences: stopSequences,
        stream: false,
        system:
          "You must return the response in valid JSON Format with proper schema, nothing else ",
      });

      let resposneText = "";
      const block = response.content[0];

      if (block.type === "text") {
        resposneText += block.text;
      }

      if (resposneText === "") {
        throw new Error("Anthropic didn't responded");
      }

      let parsedObject: any;
      try {
        parsedObject = JSON.parse(resposneText);
      } catch (err) {
        throw new Error(`The JSON returned by Anthropic API is not valid \n ${err}`);
      }

      const parsedResult = options.schema.safeParse(parsedObject);
      if (!parsedResult.success) {
        throw new Error(
          `the response doesn't match the specified schema: ${parsedResult.error.message}`,
        );
      }

      if (options.onStepFinish) {
        const step = this.createStepFromChunk({
          type: "text",
          text: resposneText,
          usage: response.usage,
        });
        if (step) options.onStepFinish(step);
      }

      return {
        provider: response,
        object: parsedResult.data,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        finishReason: response.stop_reason as string,
      };
    } catch (error) {
      console.error(
        `Failed to create object ${error instanceof Error ? error.message : String(error)}`,
      );
      return { error: String(error) } as any;
    }
  }

  async streamObject<TSchema extends z.ZodType>(
    options: StreamObjectOptions<string, TSchema>,
  ): Promise<ProviderObjectStreamResponse<any, z.infer<TSchema>>> {
    try {
      const anthropicMessages = options.messages.map(this.toMessage);

      const { temperature = 0.2, maxTokens = 1024, topP, stopSequences } = options.provider || {};

      const response = await this.anthropic.messages.create({
        messages: anthropicMessages,
        model: options.model || this.model,
        max_tokens: maxTokens,
        temperature: temperature,
        top_p: topP,
        stop_sequences: stopSequences,
        stream: true,
        system: "You must return the response in valid JSON Format, with proper schema ",
      });

      let accumulatedText = "";

      // Start processing in the background without awaiting
      const objectStream = new ReadableStream({
        start: async (controller) => {
          try {
            for await (const chunk of response) {
              if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
                accumulatedText += chunk.delta.text;

                // Try to parse partial JSON as it comes in
                try {
                  const partialObject = JSON.parse(accumulatedText);
                  const parseResult = options.schema.safeParse(partialObject);

                  if (parseResult.success) {
                    controller.enqueue(parseResult.data);
                  }
                } catch {
                  // Expected - will fail until we have valid JSON
                }
              }

              if (chunk.type === "message_stop") {
                try {
                  const parsedObject = JSON.parse(accumulatedText);
                  const parsedResult = options.schema.safeParse(parsedObject);

                  if (parsedResult.success) {
                    controller.enqueue(parsedResult.data);

                    if (options.onFinish) {
                      await options.onFinish(parsedResult.data);
                    }

                    if (options.onStepFinish) {
                      await options.onStepFinish(parsedResult.data);
                    }
                  } else {
                    console.warn(
                      "Response does not match the specified schema:",
                      parsedResult.error.message,
                    );
                    throw new Error(`Schema validation failed: ${parsedResult.error.message}`);
                  }
                } catch (error) {
                  const voltError: VoltAgentError = {
                    message: "Anthropic API did not return valid JSON",
                    originalError: error,
                  };
                  if (options.onError) {
                    options?.onError(voltError);
                  }
                  console.warn("Anthropic API did not return valid JSON:", accumulatedText);
                  controller.error(voltError);
                }

                // Close when done
                controller.close();
                return;
              }
            }
          } catch (error) {
            const voltError: VoltAgentError = {
              message: "Error while parsing streamed object response in Anthropic API",
              originalError: error,
            };
            if (options.onError) {
              options.onError(voltError);
            }
            controller.error(voltError);
          }
        },
      });

      return {
        provider: response,
        objectStream,
      };
    } catch (error) {
      const voltError: VoltAgentError = {
        message: "Error while generating streamed object from Anthropic API",
        originalError: error,
      };

      if (options.onError) {
        options.onError(voltError);
      }

      console.error(
        `Failed to create object ${error instanceof Error ? error.message : String(error)}`,
      );
      throw voltError;
    }
  }
}

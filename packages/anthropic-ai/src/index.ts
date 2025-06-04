import Anthropic from "@anthropic-ai/sdk";
import type {
  BaseMessage,
  BaseTool,
  GenerateObjectOptions,
  GenerateTextOptions,
  LLMProvider,
  ProviderObjectResponse,
  ProviderObjectStreamResponse,
  ProviderTextResponse,
  ProviderTextStreamResponse,
  StreamObjectOptions,
  StreamTextOptions,
  VoltAgentError,
} from "@voltagent/core";
import type { z } from "zod";
import type {
  AnthropicMessage,
  AnthropicProviderOptions,
  AnthropicTool,
  AnthropicToolCall,
  StopMessageChunk,
} from "./types";
import {
  createResponseObject,
  createStepFromChunk,
  generateVoltError,
  getSystemMessage,
  handleStepFinish,
  processContent,
  processResponseContent,
  zodToJsonSchema,
} from "./utils";

export class AnthropicProvider implements LLMProvider<string> {
  private anthropic: Anthropic;
  private model: string;

  constructor(options: AnthropicProviderOptions = {}) {
    //mock client for tests
    this.anthropic =
      options.client ?? new Anthropic({ apiKey: options.apiKey ?? process.env.ANTHROPIC_API_KEY });
    this.model = "claude-3-7-sonnet-20250219";

    this.getModelIdentifier = this.getModelIdentifier.bind(this);
    this.toMessage = this.toMessage.bind(this);
    this.toTool = this.toTool.bind(this);
    this.generateText = this.generateText.bind(this);
    this.streamText = this.streamText.bind(this);
    this.generateObject = this.generateObject.bind(this);
    this.streamObject = this.streamObject.bind(this);
  }

  getModelIdentifier(model: string): string {
    return model;
  }

  toMessage = (message: BaseMessage): AnthropicMessage | null => {
    // Special role handling
    if (message.role === "tool") {
      return {
        role: "assistant",
        content: String(message.content),
      };
    }
    if (message.role === "system") {
      return null;
    }

    const processedContent = processContent(message.content);

    return {
      role: message.role,
      content: processedContent,
    };
  };

  private getAnthropicMessages(messages: BaseMessage[]): AnthropicMessage[] {
    return messages.map(this.toMessage).filter((message) => message !== null);
  }

  toTool(tool: BaseTool): AnthropicTool {
    return {
      name: tool.name,
      description: tool.description,
      input_schema: zodToJsonSchema(tool.parameters),
    };
  }

  async generateText(options: GenerateTextOptions<string>): Promise<ProviderTextResponse<any>> {
    try {
      const anthropicMessages = this.getAnthropicMessages(options.messages);
      const anthropicTools = options.tools ? options.tools.map(this.toTool) : undefined;

      const response = await this.anthropic.messages.create({
        messages: anthropicMessages,
        model: this.model,
        max_tokens: options.provider?.maxTokens ?? 1024,
        temperature: options.provider?.temperature ?? 0.7,
        top_p: options.provider?.topP,
        stop_sequences: options.provider?.stopSequences,
        stream: false,
        tools: anthropicTools,
        system: getSystemMessage(options.messages),
      });

      //Processes the response content
      const { responseText, toolCalls } = processResponseContent(response.content);

      //Handles onStepFinish
      await handleStepFinish(options, responseText, toolCalls, response.usage);

      return createResponseObject(response, responseText, toolCalls);
    } catch (error) {
      throw generateVoltError("Error while generating Text in Anthropic AI", error, "llm_generate");
    }
  }

  async streamText(options: StreamTextOptions<string>): Promise<ProviderTextStreamResponse<any>> {
    try {
      const anthropicMessages = this.getAnthropicMessages(options.messages);
      const anthropicTools = options.tools ? options.tools.map(this.toTool) : undefined;

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
        system: getSystemMessage(options.messages),
      });

      const textStream = new ReadableStream({
        start: async (controller) => {
          try {
            let currentText = "";
            const currentToolCalls: AnthropicToolCall[] = [];

            for await (const chunk of response) {
              if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
                currentText += chunk.delta.text;

                const textChunk = createStepFromChunk({
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
                  const step = createStepFromChunk(toolCall);
                  if (step) await options.onChunk(step);
                }

                // Handle onStepFinish for tool call
                if (options.onStepFinish) {
                  const step = createStepFromChunk(toolCall);
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
            const voltError = generateVoltError(
              "Error while parsing streamed text response from Anthropic API",
              error,
              "llm_stream",
            );
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
      const voltError = generateVoltError(
        "Error generating streaming text in Anthropic AI",
        error,
        "llm_stream",
      );
      if (options.onError) {
        options.onError(voltError);
      }
      throw voltError;
    }
  }

  async generateObject<TSchema extends z.ZodType>(
    options: GenerateObjectOptions<string, TSchema>,
  ): Promise<ProviderObjectResponse<any, z.infer<TSchema>>> {
    const { temperature = 0.2, maxTokens = 1024, topP, stopSequences } = options.provider || {};
    const JsonSchema = zodToJsonSchema(options.schema);
    const systemPrompt = `${getSystemMessage(options.messages)}. Response Schema: ${JSON.stringify(JsonSchema)}. You must return the response in valid JSON Format with proper schema, nothing else `;

    const anthropicMessages = this.getAnthropicMessages(options.messages);
    const model = (options.model || this.model) as string;

    try {
      const response = await this.anthropic.messages.create({
        messages: anthropicMessages,
        model: model,
        max_tokens: maxTokens,
        temperature: temperature,
        top_p: topP,
        stop_sequences: stopSequences,
        stream: false,
        system: systemPrompt,
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
        const step = createStepFromChunk({
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
      throw generateVoltError(
        "Error while generating object in Anthropic AI",
        error,
        "llm_generate",
      );
    }
  }

  async streamObject<TSchema extends z.ZodType>(
    options: StreamObjectOptions<string, TSchema>,
  ): Promise<ProviderObjectStreamResponse<any, z.infer<TSchema>>> {
    try {
      const anthropicMessages = this.getAnthropicMessages(options.messages);
      const JsonSchema = zodToJsonSchema(options.schema);
      const systemPrompt = `${getSystemMessage(options.messages)}. Response Schema: ${JSON.stringify(JsonSchema)}. You must return the response in valid JSON Format with proper schema, nothing else `;
      const { temperature = 0.2, maxTokens = 1024, topP, stopSequences } = options.provider || {};

      const response = await this.anthropic.messages.create({
        messages: anthropicMessages,
        model: options.model || this.model,
        max_tokens: maxTokens,
        temperature: temperature,
        top_p: topP,
        stop_sequences: stopSequences,
        stream: true,
        system: systemPrompt,
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
            const voltError = generateVoltError(
              "Error while parsing streamed object response in Anthropic API",
              error,
              "llm_stream",
            );
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
      const voltError = generateVoltError(
        "Error while generating streamed object from Anthropic API",
        error,
        "llm_stream",
      );
      if (options.onError) {
        options.onError(voltError);
      }
      throw voltError;
    }
  }
}

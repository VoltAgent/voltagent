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
import { Groq } from "groq-sdk";
import type { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import type { GroqProviderOptions } from "./types";
import { convertToolsForSDK } from "./utils";

type GroqUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

type GroqStreamState = {
  accumulatedText: string;
  usage?: GroqUsage;
  groqMessages: Groq.Chat.ChatCompletionMessageParam[];
};

type GroqStreamConfig = {
  model: string;
  temperature: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[] | string;
  tools?: Groq.Chat.ChatCompletionTool[];
};

// Deprecation warning
console.warn(
  "\x1b[33m⚠️  DEPRECATION WARNING: @voltagent/groq-ai is deprecated and will no longer receive updates.\x1b[0m\n" +
    "\x1b[33mPlease migrate to @ai-sdk/groq with @voltagent/vercel-ai instead.\x1b[0m\n" +
    "\x1b[36mMigration guide: https://voltagent.dev/docs/providers/groq-ai/\x1b[0m\n",
);

export class GroqProvider implements LLMProvider<string> {
  // @ts-ignore
  private groq: Groq;
  constructor(private options?: GroqProviderOptions) {
    // Bind methods to preserve 'this' context
    this.groq = new Groq({
      apiKey: this.options?.apiKey || process.env.GROQ_API_KEY,
    });
    this.generateText = this.generateText.bind(this);
    this.streamText = this.streamText.bind(this);
    this.generateObject = this.generateObject.bind(this);
    this.streamObject = this.streamObject.bind(this);
    this.toMessage = this.toMessage.bind(this);
    this.createStepFromChunk = this.createStepFromChunk.bind(this);
    this.getModelIdentifier = this.getModelIdentifier.bind(this);
  }

  getModelIdentifier = (model: Groq.Model): string => {
    return model.id;
  };

  toMessage = (message: BaseMessage): Groq.Chat.ChatCompletionMessageParam => {
    // Determine the content first
    let content: string | Array<Groq.Chat.ChatCompletionContentPart>;
    if (typeof message.content === "string") {
      content = message.content;
    } else if (Array.isArray(message.content)) {
      const mappedParts: Array<Groq.Chat.ChatCompletionContentPart> = [];
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
            `[GroqProvider] Unsupported or incomplete part type in array: ${part.type}. Skipping.`,
          );
        }
      }
      content = mappedParts.length > 0 ? mappedParts : ""; // Use empty string if array resulted in no parts
    } else {
      console.warn(
        "[GroqProvider] Unknown or unsupported content type for message:",
        message.content,
      );
      content = "";
    }

    // Helper function to ensure content is string when needed
    const ensureStringContent = (
      currentContent: string | Array<Groq.Chat.ChatCompletionContentPart>,
      roleForWarning: string,
    ): string => {
      if (typeof currentContent === "string") {
        return currentContent || "";
      }
      // If it's an array, convert it to a string representation for roles that require it.
      console.warn(
        `[GroqProvider] ${roleForWarning} message content must be a string for Groq. Converting array content to string representation.`,
      );
      // Explicitly check the type of each part in the array
      return (
        currentContent
          .map((p) => {
            if (p.type === "text") {
              return p.text;
            }
            if (p.type === "image_url") {
              // Safely access url property
              const urlPreview = p.image_url?.url?.substring(0, 50) ?? "[No URL]";
              return `[Image: ${urlPreview}...]`;
            }
            // Handle potential future part types or unexpected types gracefully
            // Cast p to unknown to bypass the 'never' type before checking its structure
            const unknownP = p as unknown;
            let partType = "unknown";
            if (typeof unknownP === "object" && unknownP !== null && "type" in unknownP) {
              // Safely access type after checks, converting to string
              partType = String((unknownP as { type: unknown }).type);
            }
            return `[Unsupported Part: ${partType}]`;
          })
          .join(" ") || ""
      );
    };
    // Determine role and construct the final message param object based on role
    switch (message.role) {
      case "system":
        return {
          role: "system",
          content: ensureStringContent(content, "System"),
        };
      case "user":
        // User messages can have string or array content according to Groq docs
        return { role: "user", content: content || "" };
      case "assistant":
        // Assistant messages in Groq likely expect string content.
        return {
          role: "assistant",
          content: ensureStringContent(content, "Assistant"),
        };
      case "tool":
        console.warn(
          "[GroqProvider] Mapping 'tool' role to 'assistant' for content transmission. Groq's tool handling might differ.",
        );
        // Assuming tool results are passed as stringified content
        return {
          role: "assistant",
          content: ensureStringContent(content, "Tool(as Assistant)"),
        };
      default:
        console.warn(`[GroqProvider] Unsupported role: ${message.role}. Defaulting to 'user'.`);
        // Defaulting to user role, which supports complex content
        return { role: "user", content: content || "" };
    }
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

  private buildStreamParams(
    config: GroqStreamConfig,
    messages: Groq.Chat.ChatCompletionMessageParam[],
    includeTools: boolean,
  ) {
    return {
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      top_p: config.topP,
      frequency_penalty: config.frequencyPenalty,
      presence_penalty: config.presencePenalty,
      stop: config.stopSequences,
      stream: true,
      ...(includeTools ? { tools: config.tools } : {}),
    };
  }

  private updateUsageFromChunk(
    chunk: Groq.Chat.ChatCompletionChunk,
    currentUsage: GroqUsage | undefined,
  ): GroqUsage | undefined {
    if (chunk.x_groq?.usage) {
      return {
        promptTokens: chunk.x_groq.usage.prompt_tokens,
        completionTokens: chunk.x_groq.usage.completion_tokens,
        totalTokens: chunk.x_groq.usage.total_tokens,
      };
    }
    return currentUsage;
  }

  private async emitTextChunk(
    content: string,
    controller: ReadableStreamDefaultController<string>,
    options: StreamTextOptions<string>,
    state: GroqStreamState,
  ): Promise<void> {
    if (!content) {
      return;
    }

    state.accumulatedText += content;
    controller.enqueue(content);

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

  private async executeToolCalls(
    toolCalls: Array<any>,
    tools: NonNullable<StreamTextOptions<string>["tools"]>,
    options: StreamTextOptions<string>,
    usage: GroqUsage | undefined,
    groqMessages: Groq.Chat.ChatCompletionMessageParam[],
  ): Promise<Array<{ toolCallId: string; name: string; output: any }>> {
    const toolResults: Array<{ toolCallId: string; name: string; output: any }> = [];

    for (const toolCall of toolCalls) {
      const step = this.createStepFromChunk({
        type: "tool-call",
        toolCallId: toolCall.id,
        toolName: toolCall.function?.name,
        args: toolCall.function?.arguments,
        usage,
      });
      if (step && options.onChunk) await options.onChunk(step);
      if (step && options.onStepFinish) await options.onStepFinish(step);

      const functionName = toolCall.function?.name;
      const functionToCall = tools.find((toolItem) => functionName === toolItem.name)?.execute;
      const functionArgs = JSON.parse(
        toolCall.function?.arguments ? toolCall.function?.arguments : "{}",
      );
      if (functionToCall === undefined) {
        throw new Error(`Function ${functionName} not found in tools`);
      }
      const functionResponse = await functionToCall(functionArgs);
      if (functionResponse === undefined) {
        throw new Error(`Function ${functionName} returned undefined`);
      }
      toolResults.push({
        toolCallId: toolCall.id,
        name: functionName,
        output: functionResponse,
      });

      groqMessages.push({
        tool_call_id: toolCall.id ? toolCall.id : "",
        role: "tool",
        content: JSON.stringify(functionResponse),
      });
    }

    return toolResults;
  }

  private async emitToolResults(
    toolResults: Array<{ toolCallId: string; name: string; output: any }>,
    options: StreamTextOptions<string>,
    usage: GroqUsage | undefined,
  ): Promise<void> {
    if (toolResults.length === 0) {
      return;
    }

    for (const toolResult of toolResults) {
      const step = this.createStepFromChunk({
        type: "tool-result",
        toolCallId: toolResult.toolCallId,
        toolName: toolResult.name,
        result: toolResult.output,
        usage,
      });
      if (step && options.onChunk) await options.onChunk(step);
      if (step && options.onStepFinish) await options.onStepFinish(step);
    }
  }

  private async processStreamChunk(params: {
    chunk: Groq.Chat.ChatCompletionChunk;
    controller: ReadableStreamDefaultController<string>;
    options: StreamTextOptions<string>;
    state: GroqStreamState;
    streamConfig: GroqStreamConfig;
  }): Promise<void> {
    const { chunk, controller, options, state, streamConfig } = params;
    const content = chunk.choices[0]?.delta?.content || "";
    await this.emitTextChunk(content, controller, options, state);
    state.usage = this.updateUsageFromChunk(chunk, state.usage);

    const toolCalls = chunk.choices[0]?.delta?.tool_calls || [];
    if (toolCalls.length === 0 || !options.tools) {
      return;
    }

    const toolResults = await this.executeToolCalls(
      toolCalls,
      options.tools,
      options,
      state.usage,
      state.groqMessages,
    );
    await this.emitToolResults(toolResults, options, state.usage);

    const secondStream = await this.groq.chat.completions.create(
      this.buildStreamParams(streamConfig, state.groqMessages, false),
    );

    for await (const followUpChunk of secondStream) {
      const followUpContent = followUpChunk.choices[0]?.delta?.content || "";
      await this.emitTextChunk(followUpContent, controller, options, state);
      state.usage = this.updateUsageFromChunk(followUpChunk, state.usage);
    }
  }

  private async runTextStreamProcessing(params: {
    stream: AsyncIterable<Groq.Chat.ChatCompletionChunk>;
    controller: ReadableStreamDefaultController<string>;
    options: StreamTextOptions<string>;
    state: GroqStreamState;
    streamConfig: GroqStreamConfig;
  }): Promise<void> {
    const { stream, controller, options, state, streamConfig } = params;
    for await (const chunk of stream) {
      await this.processStreamChunk({ chunk, controller, options, state, streamConfig });
    }

    controller.close();
    await this.finalizeTextStream(options, state);
  }

  private async finalizeTextStream(
    options: StreamTextOptions<string>,
    state: GroqStreamState,
  ): Promise<void> {
    if (options.onFinish) {
      await options.onFinish({
        text: state.accumulatedText,
      });
    }

    if (options.onStepFinish && state.accumulatedText) {
      const textStep = {
        id: "",
        type: "text" as const,
        content: state.accumulatedText,
        role: "assistant" as MessageRole,
        usage: state.usage,
      };
      await options.onStepFinish(textStep);
    }
  }

  generateText = async (
    options: GenerateTextOptions<string>,
  ): Promise<ProviderTextResponse<any>> => {
    try {
      const groqMessages = options.messages.map(this.toMessage);
      const groqTools = options.tools ? convertToolsForSDK(options.tools) : undefined;

      // Extract common parameters
      const {
        temperature = 0.7,
        maxTokens,
        topP,
        frequencyPenalty,
        presencePenalty,
        stopSequences,
      } = options.provider || {};

      // Call Groq API
      const response = await this.groq.chat.completions.create({
        model: options.model,
        messages: groqMessages,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        tools: groqTools,
        stop: stopSequences,
      });

      // Extract usage information
      const usage = response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined;
      // Extract tool calls and results from the response
      const responseMessage = response.choices[0].message;
      const toolCalls = responseMessage.tool_calls;
      const toolResults = [];

      if (toolCalls && toolCalls.length > 0 && options && options.tools) {
        for (const toolCall of toolCalls) {
          // Handle all tool calls - each as a separate step
          const step = this.createStepFromChunk({
            type: "tool-call",
            toolCallId: toolCall.id,
            toolName: toolCall.function.name,
            args: toolCall.function.arguments,
            usage: usage,
          });
          if (step && options.onStepFinish) await options.onStepFinish(step);
          //Call the function with the arguments
          const functionName = toolCall.function.name;
          const functionToCall = options.tools.find(
            (toolItem) => functionName === toolItem.name,
          )?.execute;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          if (functionToCall === undefined) {
            throw `Function ${functionName} not found in tools`;
          }
          const functionResponse = await functionToCall(functionArgs);
          if (functionResponse === undefined) {
            throw `Function ${functionName} returned undefined`;
          }
          toolResults.push({
            toolCallId: toolCall.id,
            name: functionName,
            output: functionResponse,
          });

          groqMessages.push({
            tool_call_id: toolCall.id,
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
        // Call Groq API
        const secondResponse = await this.groq.chat.completions.create({
          model: options.model,
          messages: groqMessages,
          temperature,
          max_tokens: maxTokens,
          top_p: topP,
          frequency_penalty: frequencyPenalty,
          presence_penalty: presencePenalty,
          stop: stopSequences,
        });
        // Extract results from the response
        const responseMessage = secondResponse.choices[0].message.content;

        // Return standardized response
        return {
          provider: secondResponse,
          text: responseMessage || "",
          usage,
          toolCalls: toolCalls?.map((tc) => ({
            type: "tool-call",
            toolCallId: tc.id,
            toolName: tc.function.name,
            args: tc.function.arguments,
          })),
          toolResults: toolResults,
          finishReason: response.choices[0].finish_reason,
        };
      }

      // Handle step finish callback
      if (options.onStepFinish) {
        // If there's text content, create a text step
        if (response.choices[0].message.content) {
          const textStep = this.createStepFromChunk({
            type: "text",
            text: response.choices[0].message.content,
            usage,
          });
          if (textStep) await options.onStepFinish(textStep);
        }
      }

      // Return standardized response
      return {
        provider: response,
        text: response.choices[0].message.content || "",
        usage,
        finishReason: response.choices[0].finish_reason,
      };
    } catch (error) {
      // Handle API errors
      console.error("Groq API error:", error);
      throw error;
    }
  };

  async streamText(options: StreamTextOptions<string>): Promise<ProviderTextStreamResponse<any>> {
    try {
      const groqMessages = options.messages.map(this.toMessage);
      const groqTools = options.tools ? convertToolsForSDK(options.tools) : undefined;
      // Extract common parameters
      const {
        temperature = 0.7,
        maxTokens,
        topP,
        frequencyPenalty,
        presencePenalty,
        stopSequences,
      } = options.provider || {};

      // Create stream from Groq API
      const streamConfig: GroqStreamConfig = {
        model: options.model,
        temperature,
        maxTokens,
        topP,
        frequencyPenalty,
        presencePenalty,
        stopSequences,
        tools: groqTools,
      };
      const stream = await this.groq.chat.completions.create(
        this.buildStreamParams(streamConfig, groqMessages, true),
      );

      const state: GroqStreamState = {
        accumulatedText: "",
        usage: undefined,
        groqMessages,
      };
      const provider = this; // Preserve 'this' context for the stream processing
      // Create a readable stream to return to the caller
      const textStream = createAsyncIterableStream(
        new ReadableStream({
          async start(controller) {
            try {
              await provider.runTextStreamProcessing({
                stream,
                controller,
                options,
                state,
                streamConfig,
              });
            } catch (error) {
              // Handle errors during streaming
              console.error("Error during Groq stream processing:", error);
              controller.error(error);

              // TODO: fix this
              if (options.onError) options.onError(error as any);
            }
          },
        }),
      );

      // Return provider and text stream
      return {
        provider: stream,
        textStream,
      };
    } catch (error) {
      // Handle API errors
      console.error("Groq streaming API error:", error);

      // TODO: fix this
      if (options.onError) options.onError(error as any);
      throw error;
    }
  }

  // Generate object with Groq API (if supported)
  async generateObject<TSchema extends z.ZodType>(
    options: GenerateObjectOptions<string, TSchema>,
  ): Promise<ProviderObjectResponse<any, z.infer<TSchema>>> {
    try {
      const groqMessages = options.messages.map(this.toMessage);

      // Add system message instructing to generate JSON following the schema
      const schemaDescription =
        JSON.stringify(zodToJsonSchema(options.schema)) ||
        "Respond with a JSON object according to the specified schema.";
      const systemMessage = {
        role: "system",
        content: `Schema: ${schemaDescription} \n Respond with ONLY a valid JSON object, nothing else.`,
      } as Groq.Chat.ChatCompletionMessageParam;

      // Extract common parameters
      const {
        temperature = 0.2, // Lower temperature for more deterministic JSON generation
        maxTokens,
        topP,
      } = options.provider || {};

      // Call Groq API with JSON mode
      const response = await this.groq.chat.completions.create({
        model: options.model,
        messages: [systemMessage, ...groqMessages],
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        response_format: { type: "json_object" },
      });

      // Parse JSON response
      let parsedObject: z.infer<TSchema>;
      try {
        const content = response.choices[0].message.content || "{}";
        const rawObject = JSON.parse(content);
        parsedObject = options.schema.parse(rawObject);
      } catch (parseError: any) {
        console.error("Error parsing JSON from Groq response:", parseError);
        throw new Error(`Failed to parse JSON response: ${parseError.message}`);
      }

      // Extract usage information
      const usage = response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
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
        provider: response,
        object: parsedObject,
        usage,
        finishReason: response.choices[0].finish_reason,
      };
    } catch (error) {
      console.error("Groq generateObject API error:", error);
      throw error;
    }
  }
  // Stream object with Groq API (if supported)
  async streamObject<TSchema extends z.ZodType>(
    options: StreamObjectOptions<string, TSchema>,
  ): Promise<ProviderObjectStreamResponse<any, z.infer<TSchema>>> {
    try {
      const groqMessages = options.messages.map(this.toMessage);
      // Add system message instructing to generate JSON following the schema
      const schemaDescription =
        JSON.stringify(zodToJsonSchema(options.schema)) ||
        "Respond with a JSON object according to the specified schema.";
      const systemMessage = {
        role: "system",
        content: `Schema: ${schemaDescription} \n Respond with ONLY a valid JSON object, nothing else.`,
      } as Groq.Chat.ChatCompletionMessageParam;

      // Extract common parameters
      const {
        temperature = 0.2, // Lower temperature for more deterministic JSON generation
        maxTokens,
        topP,
      } = options.provider || {};

      // Call Groq API with JSON mode
      const stream = await this.groq.chat.completions.create({
        model: options.model,
        messages: [systemMessage, ...groqMessages],
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        response_format: { type: "json_object" },
        stream: true,
      });
      let accumulatedText = "";
      let usage:
        | {
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
          }
        | undefined; // Initialize usage as potentially undefined

      // Create a readable stream to return to the caller
      const textStream = createAsyncIterableStream(
        new ReadableStream({
          async start(controller) {
            try {
              // Process each chunk from the Groq stream
              for await (const chunk of stream) {
                // Extract content from the chunk
                const content = chunk.choices[0]?.delta?.content || "";

                // If we have content, add it to accumulated text and emit it
                if (content) {
                  accumulatedText += content;
                  controller.enqueue(content);
                }

                if (chunk.x_groq?.usage) {
                  usage = {
                    promptTokens: chunk.x_groq.usage.prompt_tokens,
                    completionTokens: chunk.x_groq.usage.completion_tokens,
                    totalTokens: chunk.x_groq.usage.total_tokens,
                  };
                }
              }

              // When stream completes, close the controller
              controller.close();

              // Call onFinish with complete result
              if (options.onFinish) {
                let parsedObject: z.infer<TSchema>;
                try {
                  parsedObject = options.schema.parse(JSON.parse(accumulatedText || "{}"));
                } catch (parseError: any) {
                  console.error("Error parsing JSON in streamObject onFinish:", parseError);
                  // Propagate the error or handle as appropriate.
                  // Let the stream's main error handler call options.onError.
                  throw new Error(`Failed to parse streamed JSON: ${parseError.message}`);
                }
                await options.onFinish({
                  object: parsedObject,
                  usage, // Pass usage here
                });
              }

              // Call onStepFinish with complete result if provided
              // This step represents the final accumulated text, not necessarily a parsed object step.
              // The type "text" for content: string is appropriate here.
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
              console.error("Error during Groq stream processing:", error);
              controller.error(error); // Make the ReadableStream error out
              if (options.onError) options.onError(error as any);
            }
          },
        }),
      );

      return {
        provider: stream,
        objectStream: textStream,
      };
    } catch (error) {
      // Handle API errors (e.g., initial call to create stream failed)
      console.error("Groq streamObject API error:", error);
      if (options.onError) options.onError(error as any);
      throw error;
    }
  }
}

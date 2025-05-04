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
import type { z } from "zod";
import type { GroqProviderOptions } from "./types";
import { Groq } from "groq-sdk";

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
    return null;
  };

  generateText = async (
    options: GenerateTextOptions<string>,
  ): Promise<ProviderTextResponse<any>> => {
    try {
      const groqMessages = options.messages.map(this.toMessage);

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
      const stream = await this.groq.chat.completions.create({
        model: options.model,
        messages: groqMessages,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        stop: stopSequences,
        // Enable streaming
        stream: true,
      });

      let accumulatedText = "";
      let usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      };

      // Create a readable stream to return to the caller
      const textStream = new ReadableStream({
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

              if (chunk.x_groq?.usage) {
                usage = {
                  promptTokens: chunk.x_groq?.usage.prompt_tokens,
                  completionTokens: chunk.x_groq?.usage.completion_tokens,
                  totalTokens: chunk.x_groq?.usage.total_tokens,
                };
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
            console.error("Error during Groq stream processing:", error);
            controller.error(error);
            // TODO: fix this
            if (options.onError) options.onError(error as any);
          }
        },
      });

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
        options.schema.description ||
        "Respond with a JSON object according to the specified schema.";
      const systemMessage = {
        role: "system",
        content: `${schemaDescription}\nRespond with ONLY a valid JSON object, nothing else.`,
      } as any;

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

  async streamObject<TSchema extends z.ZodType>(
    _options: StreamObjectOptions<string, TSchema>,
  ): Promise<ProviderObjectStreamResponse<any, z.infer<TSchema>>> {
    throw new Error("streamObject is not implemented for GroqProvider yet.");
  }
}

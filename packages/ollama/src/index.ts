import type {
  BaseMessage,
  GenerateObjectOptions,
  GenerateTextOptions,
  LLMProvider,
  MessageContent,
  MessageRole,
  ProviderObjectResponse,
  ProviderObjectStreamResponse,
  ProviderTextResponse,
  ProviderTextStreamResponse,
  StepWithContent,
  StreamObjectOptions,
  StreamTextOptions,
  UsageInfo,
} from "@voltagent/core";
import type { z } from "zod";
import type {
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaMessage,
  OllamaProviderOptions,
} from "./types";

/**
 * Custom error class for Ollama-related errors
 */
export class OllamaError extends Error {
  constructor(
    message: string,
    public status?: number,
    public statusText?: string,
    public code?: string,
  ) {
    super(message);
    this.name = "OllamaError";
  }
}

/**
 * Error class for model-related issues
 */
export class OllamaModelError extends OllamaError {
  constructor(message: string, status?: number) {
    super(message, status);
    this.name = "OllamaModelError";
    this.code = "MODEL_ERROR";
  }
}

/**
 * Error class for connection-related issues
 */
export class OllamaConnectionError extends OllamaError {
  constructor(message: string) {
    super(message);
    this.name = "OllamaConnectionError";
    this.code = "CONNECTION_ERROR";
  }
}

/**
 * Error class for validation-related issues
 */
export class OllamaValidationError extends OllamaError {
  constructor(message: string) {
    super(message);
    this.name = "OllamaValidationError";
    this.code = "VALIDATION_ERROR";
  }
}

/**
 * Default Ollama API base URL
 */
const DEFAULT_BASE_URL = "http://localhost:11434";

/**
 * Ollama LLM provider for voltagent
 */
export class OllamaProvider implements LLMProvider<string> {
  private baseUrl: string;

  /**
   * Create a new Ollama provider
   */
  constructor(options?: OllamaProviderOptions) {
    this.baseUrl = options?.baseUrl || DEFAULT_BASE_URL;

    // Bind methods to preserve 'this' context
    this.generateText = this.generateText.bind(this);
    this.streamText = this.streamText.bind(this);
    this.generateObject = this.generateObject.bind(this);
    this.streamObject = this.streamObject.bind(this);
    this.toMessage = this.toMessage.bind(this);
    this.getModelIdentifier = this.getModelIdentifier.bind(this);
  }

  /**
   * Get model identifier
   */
  getModelIdentifier(model: string): string {
    return model;
  }

  /**
   * Convert BaseMessage to OllamaMessage
   */
  toMessage(message: BaseMessage): OllamaMessage {
    const role = this.mapRole(message.role);
    const content = this.getMessageContent(message.content);
    return { role, content };
  }

  /**
   * Generate text using Ollama API
   */
  async generateText(
    options: GenerateTextOptions<string>,
  ): Promise<ProviderTextResponse<OllamaGenerateResponse | OllamaChatResponse>> {
    const model = options.model;
    const messages = options.messages;
    const providerOptions = options.provider || {};

    let response: OllamaGenerateResponse | OllamaChatResponse;

    // Use the chat API if there are multiple messages
    if (messages.length > 1) {
      const ollamaMessages = messages.map(this.toMessage);
      const chatRequest: OllamaChatRequest = {
        model,
        messages: ollamaMessages,
        temperature: providerOptions.temperature,
        max_tokens: providerOptions.maxTokens,
        top_p: providerOptions.topP,
        frequency_penalty: providerOptions.frequencyPenalty,
        presence_penalty: providerOptions.presencePenalty,
        seed: providerOptions.seed,
        stop: providerOptions.stopSequences,
        stream: false,
      };

      response = await this.chatCompletion(chatRequest, options.signal);

      // Return standardized response
      return {
        provider: response,
        text: (response as OllamaChatResponse).message?.content || "",
        usage: this.extractUsageFromResponse(response),
      };
    }

    // Use the generate API for a single message (typically user prompt)
    const content = this.getMessageContent(messages[0].content);
    const generateRequest: OllamaGenerateRequest = {
      model,
      prompt: content,
      temperature: providerOptions.temperature,
      max_tokens: providerOptions.maxTokens,
      top_p: providerOptions.topP,
      frequency_penalty: providerOptions.frequencyPenalty,
      presence_penalty: providerOptions.presencePenalty,
      seed: providerOptions.seed,
      stop: providerOptions.stopSequences,
      stream: false,
    };

    response = await this.textCompletion(generateRequest, options.signal);

    // Return standardized response
    return {
      provider: response,
      text: (response as OllamaGenerateResponse).response || "",
      usage: this.extractUsageFromResponse(response),
    };
  }

  /**
   * Stream text using Ollama API
   */
  async streamText(
    options: StreamTextOptions<string>,
  ): Promise<
    ProviderTextStreamResponse<ReadableStream<OllamaGenerateResponse | OllamaChatResponse>>
  > {
    const model = options.model;
    const messages = options.messages;
    const providerOptions = options.provider || {};

    // Create a TransformStream to transform Ollama responses into text chunks
    const transformStream = new TransformStream<
      OllamaGenerateResponse | OllamaChatResponse,
      string
    >({
      transform: (chunk, controller) => {
        // Handle both response types
        if ("message" in chunk) {
          // Chat response
          const content = chunk.message?.content || "";
          if (content && !chunk.done) {
            controller.enqueue(content);
          }

          // Call onStepFinish if provided
          if (options.onStepFinish && chunk.done) {
            const step: StepWithContent = {
              id: "",
              type: "text",
              content: content,
              role: "assistant" as MessageRole,
              usage: this.extractUsageFromResponse(chunk),
            };
            options.onStepFinish(step);
          }
        } else {
          // Generate response
          const content = chunk.response || "";
          if (content && !chunk.done) {
            controller.enqueue(content);
          }

          // Call onStepFinish if provided
          if (options.onStepFinish && chunk.done) {
            const step: StepWithContent = {
              id: "",
              type: "text",
              content: content,
              role: "assistant" as MessageRole,
              usage: this.extractUsageFromResponse(chunk),
            };
            options.onStepFinish(step);
          }
        }
      },
    });

    let streamResponse: ReadableStream<OllamaGenerateResponse | OllamaChatResponse>;

    // Use the chat API if there are multiple messages
    if (messages.length > 1) {
      const ollamaMessages = messages.map(this.toMessage);
      const chatRequest: OllamaChatRequest = {
        model,
        messages: ollamaMessages,
        temperature: providerOptions.temperature,
        max_tokens: providerOptions.maxTokens,
        top_p: providerOptions.topP,
        frequency_penalty: providerOptions.frequencyPenalty,
        presence_penalty: providerOptions.presencePenalty,
        seed: providerOptions.seed,
        stop: providerOptions.stopSequences,
        stream: true,
      };

      streamResponse = await this.streamChatCompletion(chatRequest, options.signal);
    } else {
      // Use the generate API for a single message (typically user prompt)
      const content = this.getMessageContent(messages[0].content);
      const generateRequest: OllamaGenerateRequest = {
        model,
        prompt: content,
        temperature: providerOptions.temperature,
        max_tokens: providerOptions.maxTokens,
        top_p: providerOptions.topP,
        frequency_penalty: providerOptions.frequencyPenalty,
        presence_penalty: providerOptions.presencePenalty,
        seed: providerOptions.seed,
        stop: providerOptions.stopSequences,
        stream: true,
      };

      streamResponse = await this.streamTextCompletion(generateRequest, options.signal);
    }

    // Connect response stream to transform stream
    streamResponse.pipeTo(transformStream.writable);

    // Return the standardized response
    return {
      provider: streamResponse,
      textStream: transformStream.readable,
    };
  }

  /**
   * Generate object using Ollama API
   * Note: This is a best-effort implementation as Ollama doesn't have native JSON mode
   */
  async generateObject<TSchema extends z.ZodType>(
    options: GenerateObjectOptions<string, TSchema>,
  ): Promise<
    ProviderObjectResponse<OllamaGenerateResponse | OllamaChatResponse, z.infer<TSchema>>
  > {
    // Add instructions for JSON output
    const jsonInstructions: BaseMessage = {
      role: "system",
      content: `You must respond with a valid JSON object that matches the following schema. Do not include explanatory text or markdown formatting - just return the raw JSON. Schema: ${JSON.stringify(options.schema)}`,
    };

    // Include original system message if it exists
    const messagesWithJsonInstructions = [...options.messages];
    if (messagesWithJsonInstructions[0]?.role === "system") {
      messagesWithJsonInstructions[0] = {
        ...messagesWithJsonInstructions[0],
        content: `${this.getMessageContent(messagesWithJsonInstructions[0].content)}\n\n${this.getMessageContent(jsonInstructions.content)}`,
      };
    } else {
      messagesWithJsonInstructions.unshift(jsonInstructions);
    }

    // Use generateText with modified messages
    const textResult = await this.generateText({
      ...options,
      messages: messagesWithJsonInstructions,
    });

    try {
      // Parse the response as JSON
      const jsonString = textResult.text.trim();
      const jsonObject = JSON.parse(jsonString);

      // Validate against schema
      const validatedObject = options.schema.parse(jsonObject);

      return {
        provider: textResult.provider,
        object: validatedObject,
        usage: textResult.usage,
      };
    } catch (error) {
      throw new Error(
        `Failed to parse Ollama response as valid JSON matching the schema: ${error}`,
      );
    }
  }

  /**
   * Stream object using Ollama API
   * Note: Currently streams the full object at the end since Ollama doesn't natively support
   * JSON streaming or partial object generation
   */
  async streamObject<TSchema extends z.ZodType>(
    options: StreamObjectOptions<string, TSchema>,
  ): Promise<
    ProviderObjectStreamResponse<ReadableStream<Partial<z.infer<TSchema>>>, z.infer<TSchema>>
  > {
    const jsonInstructions: BaseMessage = {
      role: "system",
      content: `You must respond with ONLY a valid JSON object matching this exact schema:
${JSON.stringify(options.schema)}

Rules:
1. Return ONLY the JSON object, no other text
2. Do not include \`\`\`json or any other markdown
3. The response must be a single valid JSON object
4. All fields are required strings`,
    };

    const messagesWithJsonInstructions = [...options.messages];

    if (messagesWithJsonInstructions[0]?.role === "system") {
      messagesWithJsonInstructions[0] = {
        ...messagesWithJsonInstructions[0],
        content: `${this.getMessageContent(messagesWithJsonInstructions[0].content)}\n\n${this.getMessageContent(jsonInstructions.content)}`,
      };
    } else {
      messagesWithJsonInstructions.unshift(jsonInstructions);
    }

    const textStreamResult = await this.streamText({
      model: options.model,
      messages: messagesWithJsonInstructions,
      provider: options.provider,
      signal: options.signal,
      onStepFinish: undefined,
      onFinish: undefined,
    });

    const objectStream = new ReadableStream<Partial<z.infer<TSchema>>>({
      async start(controller) {
        let fullResponse = "";
        const textReader = textStreamResult.textStream.getReader();

        try {
          while (true) {
            const { done, value } = await textReader.read();

            if (done) {
              break;
            }
            fullResponse += value;
          }

          let potentialJson = fullResponse.trim();

          // Remove any markdown formatting or extra text
          if (potentialJson.includes("{")) {
            potentialJson = potentialJson.substring(potentialJson.indexOf("{"));
            if (potentialJson.includes("}")) {
              potentialJson = potentialJson.substring(0, potentialJson.lastIndexOf("}") + 1);
            }
          }

          const jsonObject = JSON.parse(potentialJson);

          const validatedObject = options.schema.parse(jsonObject);

          controller.enqueue(validatedObject);

          if (options.onFinish) {
            try {
              options.onFinish({ object: validatedObject });
            } catch (finishError) {
              console.error("[PROVIDER streamObject] Error in onFinish callback:", finishError);
            }
          }
        } catch (error) {
          console.error(
            "[PROVIDER streamObject] Error processing stream or validating JSON:",
            error,
          );

          // Try to extract the character object if it exists
          try {
            if (fullResponse.includes('"character"')) {
              const jsonObject = JSON.parse(fullResponse);
              if (jsonObject.character) {
                const validatedObject = options.schema.parse({ character: jsonObject.character });

                controller.enqueue(validatedObject);
                if (options.onFinish) {
                  options.onFinish({ object: validatedObject });
                }
                return;
              }
            }
          } catch (nestedError) {
            console.error(
              "[PROVIDER streamObject] Failed to validate nested character object:",
              nestedError,
            );
          }

          const errorPayload = {
            __error: `Failed to parse/validate JSON: ${error instanceof Error ? error.message : String(error)}`,
          } as unknown as Partial<z.infer<TSchema>>;

          controller.enqueue(errorPayload);

          if (options.onFinish) {
            try {
              options.onFinish({ object: undefined, error: error as Error } as any);
            } catch (finishError) {
              console.error(
                "[PROVIDER streamObject] Error in onFinish callback on error:",
                finishError,
              );
            }
          }
        } finally {
          controller.close();
        }
      },

      cancel(reason) {
        textStreamResult.textStream
          .cancel(reason)
          .catch((e) => console.error("Error cancelling textStream", e));
      },
    });

    return {
      provider: textStreamResult.provider,
      objectStream: objectStream,
    };
  }

  /**
   * Map voltagent role to Ollama role
   */
  private mapRole(role: MessageRole): OllamaMessage["role"] {
    switch (role) {
      case "user":
        return "user";
      case "assistant":
        return "assistant";
      case "system":
        return "system";
      case "tool":
        // Ollama doesn't support tool role, so we'll treat it as a user message
        return "user";
      default:
        return "user";
    }
  }

  /**
   * Extract message content as a string
   */
  private getMessageContent(content: MessageContent): string {
    if (typeof content === "string") {
      return content;
    }

    // For array content, extract and concatenate all text parts
    return content
      .map((part: { type: string; text?: string; image?: any; data?: any }) => {
        if (part.type === "text") {
          return part.text;
        }
        // Currently, Ollama doesn't support images or files in messages through its API
        // You could encode images as base64 with markdown for some models
        return "";
      })
      .join("\n");
  }

  /**
   * Handle API response errors
   */
  private handleApiError(response: Response, context: string): never {
    if (response.status === 404) {
      throw new OllamaModelError(
        `Model not found or Ollama API endpoint not available at ${this.baseUrl}`,
        response.status,
      );
    }

    if (response.status === 400) {
      throw new OllamaValidationError(
        `Invalid request parameters in ${context}. Please check your input.`,
      );
    }

    if (response.status === 500) {
      throw new OllamaError(
        `Internal Ollama server error during ${context}`,
        response.status,
        response.statusText,
        "SERVER_ERROR",
      );
    }

    throw new OllamaError(
      `Unexpected Ollama API error during ${context}`,
      response.status,
      response.statusText,
    );
  }

  /**
   * Send a text completion request to Ollama
   */
  private async textCompletion(
    request: OllamaGenerateRequest,
    signal?: AbortSignal,
  ): Promise<OllamaGenerateResponse> {
    const url = `${this.baseUrl}/api/generate`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal,
      });

      if (!response.ok) {
        this.handleApiError(response, "text completion");
      }

      return await response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new OllamaConnectionError(
          `Failed to connect to Ollama server at ${this.baseUrl}. Please ensure Ollama is running.`,
        );
      }
      throw error;
    }
  }

  public getPublicMessageContent(content: MessageContent): string {
    return this.getMessageContent(content);
  }

  /**
   * Send a chat completion request to Ollama
   */
  private async chatCompletion(
    request: OllamaChatRequest,
    signal?: AbortSignal,
  ): Promise<OllamaChatResponse> {
    const url = `${this.baseUrl}/api/chat`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal,
      });

      if (!response.ok) {
        this.handleApiError(response, "chat completion");
      }

      return await response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new OllamaConnectionError(
          `Failed to connect to Ollama server at ${this.baseUrl}. Please ensure Ollama is running.`,
        );
      }
      throw error;
    }
  }

  /**
   * Stream text completion from Ollama
   */
  private async streamTextCompletion(
    request: OllamaGenerateRequest,
    signal?: AbortSignal,
  ): Promise<ReadableStream<OllamaGenerateResponse>> {
    const url = `${this.baseUrl}/api/generate`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...request,
          stream: true,
        }),
        signal,
      });

      if (!response.ok) {
        this.handleApiError(response, "stream text completion");
      }

      if (!response.body) {
        throw new OllamaError("Response body is null", response.status, response.statusText);
      }

      // Ollama returns a stream of JSON objects
      return response.body.pipeThrough(new TextDecoderStream()).pipeThrough(
        new TransformStream<string, OllamaGenerateResponse>({
          transform: (chunk, controller) => {
            // Each line is a separate JSON object
            const lines = chunk.split("\n").filter(Boolean);
            for (const line of lines) {
              try {
                const parsed = JSON.parse(line);
                controller.enqueue(parsed);
              } catch (error) {
                console.error("Error parsing Ollama response:", error);
                throw new OllamaValidationError(
                  `Failed to parse Ollama stream response: ${error instanceof Error ? error.message : String(error)}`,
                );
              }
            }
          },
        }),
      );
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new OllamaConnectionError(
          `Failed to connect to Ollama server at ${this.baseUrl}. Please ensure Ollama is running.`,
        );
      }
      throw error;
    }
  }

  /**
   * Stream chat completion from Ollama
   */
  private async streamChatCompletion(
    request: OllamaChatRequest,
    signal?: AbortSignal,
  ): Promise<ReadableStream<OllamaChatResponse>> {
    const url = `${this.baseUrl}/api/chat`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...request,
          stream: true,
        }),
        signal,
      });

      if (!response.ok) {
        this.handleApiError(response, "stream chat completion");
      }

      if (!response.body) {
        throw new OllamaError("Response body is null", response.status, response.statusText);
      }

      // Ollama returns a stream of JSON objects
      return response.body.pipeThrough(new TextDecoderStream()).pipeThrough(
        new TransformStream<string, OllamaChatResponse>({
          transform: (chunk, controller) => {
            // Each line is a separate JSON object
            const lines = chunk.split("\n").filter(Boolean);
            for (const line of lines) {
              try {
                const parsed = JSON.parse(line);
                controller.enqueue(parsed);
              } catch (error) {
                console.error("Error parsing Ollama response:", error);
                throw new OllamaValidationError(
                  `Failed to parse Ollama stream response: ${error instanceof Error ? error.message : String(error)}`,
                );
              }
            }
          },
        }),
      );
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new OllamaConnectionError(
          `Failed to connect to Ollama server at ${this.baseUrl}. Please ensure Ollama is running.`,
        );
      }
      throw error;
    }
  }

  /**
   * Extract usage information from Ollama response
   */
  private extractUsageFromResponse(
    response: OllamaGenerateResponse | OllamaChatResponse,
  ): UsageInfo | undefined {
    // For generate response
    if ("response" in response) {
      if (response.eval_count !== undefined && response.prompt_eval_count !== undefined) {
        return {
          promptTokens: response.prompt_eval_count,
          completionTokens: response.eval_count,
          totalTokens: response.prompt_eval_count + response.eval_count,
        };
      }
    }
    // For chat response
    else if ("message" in response) {
      if (response.eval_count !== undefined && response.prompt_eval_count !== undefined) {
        return {
          promptTokens: response.prompt_eval_count,
          completionTokens: response.eval_count,
          totalTokens: response.prompt_eval_count + response.eval_count,
        };
      }
    }

    return undefined;
  }

  async chat(options: {
    model: string;
    messages: BaseMessage[];
    format?: Record<string, any>;
  }): Promise<{ message: { content: string } }> {
    const url = `${this.baseUrl}/api/chat`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages.map(this.toMessage),
        format: options.format,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new OllamaError(
        `Ollama API error: ${response.status} ${response.statusText}`,
        response.status,
        response.statusText,
      );
    }

    const result = await response.json();
    return {
      message: {
        content: result.message?.content || "",
      },
    };
  }
}

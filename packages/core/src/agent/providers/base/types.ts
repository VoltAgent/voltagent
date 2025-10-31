import type {
  DataContent as AISDKDataContent,
  ToolCallOptions as AIToolCallOptions,
  AssistantContent,
  ModelMessage,
  ToolContent,
  UserContent,
} from "@ai-sdk/provider-utils";
import type { AsyncIterableStream } from "@voltagent/internal/utils";
import type { TextStreamPart } from "ai";
import type { z } from "zod";
import type { Tool } from "../../../tool";
import type {
  OperationContext,
  ProviderOptions,
  StreamObjectOnFinishCallback,
  StreamOnErrorCallback,
  StreamTextOnFinishCallback,
} from "../../types";

/**
 * Token usage information
 */
export type UsageInfo = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;
};

/**
 * Base provider response type
 */
export type ProviderResponse<TOriginalResponse> = {
  /**
   * Original response from the provider
   */
  provider: TOriginalResponse;
};

/**
 * Response type for text generation operations
 */
export type ProviderTextResponse<TOriginalResponse> = {
  /**
   * Original response from the provider
   */
  provider: TOriginalResponse;

  /**
   * Text response content
   */
  text: string;

  /**
   * Token usage information
   */
  usage?: UsageInfo;

  /**
   * Tool calls in the response (if applicable)
   */
  toolCalls?: any[];

  /**
   * Tool results in the response (if applicable)
   */
  toolResults?: any[];

  /**
   * Finish reason (if applicable)
   */
  finishReason?: string;

  /**
   * Reasoning text from the model (if applicable)
   */
  reasoning?: string;

  /**
   * Warnings from the model provider (if applicable)
   */
  warnings?: any[];
};

// Use AI SDK's TextStreamPart directly with optional subagent metadata
export type StreamPart = TextStreamPart<any> & {
  // SubAgent fields (optional)
  subAgentId?: string;
  subAgentName?: string;
};

/**
 * Response type for text streaming operations
 */
export type ProviderTextStreamResponse<TOriginalResponse> = {
  /**
   * Original response from the provider
   */
  provider: TOriginalResponse;

  /**
   * Text stream for consuming the response
   */
  textStream: AsyncIterableStream<string>;

  /**
   * Full stream for consuming all events (text, tool calls, reasoning, etc.)
   * This provides access to the complete stream of events from the provider
   * Optional - only available in providers that support it
   */
  fullStream?: AsyncIterable<StreamPart>;

  /**
   * The full generated text.
   * Resolved when the response is finished.
   * Optional - only available in providers that support it.
   */
  text?: Promise<string>;

  /**
   * The reason why generation stopped.
   * Resolved when the response is finished.
   * Optional - only available in providers that support it.
   */
  finishReason?: Promise<string>;

  /**
   * Token usage information.
   * Resolved when the response is finished.
   * Optional - only available in providers that support it.
   */
  usage?: Promise<UsageInfo>;

  /**
   * Model's reasoning text (if available).
   * Resolved when the response is finished.
   * Optional - only available in providers that support it.
   */
  reasoning?: Promise<string | undefined>;
};

/**
 * Response type for object generation operations
 */
export type ProviderObjectResponse<TOriginalResponse, TObject> = {
  /**
   * Original response from the provider
   */
  provider: TOriginalResponse;

  /**
   * Generated object
   */
  object: TObject;

  /**
   * Token usage information
   */
  usage?: UsageInfo;

  /**
   * Finish reason (if applicable)
   */
  finishReason?: string;

  /**
   * Warnings from the model provider (if applicable)
   */
  warnings?: any[];
};

/**
 * Response type for object streaming operations
 */
export type ProviderObjectStreamResponse<TOriginalResponse, TObject> = {
  /**
   * Original response from the provider
   */
  provider: TOriginalResponse;

  /**
   * Object stream for consuming partial objects
   */
  objectStream: AsyncIterableStream<Partial<TObject>>;

  /**
   * The generated object (typed according to the schema).
   * Resolved when the response is finished.
   * Optional - only available in providers that support it.
   */
  object?: Promise<TObject>;

  /**
   * Token usage information.
   * Resolved when the response is finished.
   * Optional - only available in providers that support it.
   */
  usage?: Promise<UsageInfo>;

  /**
   * Warnings from the model provider.
   * Resolved when the response is finished.
   * Optional - only available in providers that support it.
   */
  warnings?: Promise<any[] | undefined>;
};

// Re-export types from AI SDK for compatibility
export type {
  TextPart,
  ImagePart,
  FilePart,
  AssistantContent,
  ToolContent,
  UserContent,
} from "@ai-sdk/provider-utils";

/**
 * Data content type for binary data (keep our own for backward compatibility)
 */
export type DataContent = AISDKDataContent;

/**
 * Message content types from AI SDK
 */
export type MessageContent = UserContent | AssistantContent | ToolContent | string;

/**
 * Message role types
 */
export type MessageRole = "user" | "assistant" | "system" | "tool";

/**
 * Base message type - now using AI SDK's ModelMessage for full compatibility
 */
export type BaseMessage = ModelMessage;

// Schema types
export type ToolSchema = z.ZodType;

// Base tool types
export type ToolExecuteOptions = AIToolCallOptions & {
  /**
   * Optional AbortController for cancelling the execution and accessing the signal.
   * Prefer using the provided abortSignal, but we keep this for backward compatibility.
   */
  abortController?: AbortController;

  /**
   * @deprecated Use abortController.signal or options.abortSignal instead. This field will be removed in a future version.
   */
  signal?: AbortSignal;

  /**
   * The operation context associated with the agent invocation triggering this tool execution.
   * Provides access to operation-specific state like context and logging metadata.
   */
  operationContext?: OperationContext;

  /**
   * Additional options can be added in the future.
   */
  [key: string]: any;
};

export type BaseTool = Tool<any, any>;

export type BaseToolCall = {
  name: string;
  arguments: Record<string, any>;
};

// Provider-specific parameter types
export type ProviderParams<T> = T extends {
  doGenerate: (options: infer P) => any;
}
  ? P extends { messages: any; model: any }
    ? Omit<P, "messages" | "model" | "tools" | "maxSteps" | "schema">
    : Record<string, never>
  : Record<string, never>;

// Base options types
export type BaseLLMOptions<TModel, TProvider> = {
  messages: BaseMessage[];
  model: TModel;
  provider?: ProviderParams<TProvider>;
};

export interface StepWithContent {
  id: string;
  type: "text" | "tool_call" | "tool_result";
  content: string;
  role: MessageRole;
  name?: string;
  arguments?: Record<string, any>;
  result?: any;
  usage?: UsageInfo;
  subAgentId?: string;
  subAgentName?: string;
}

export type StepFinishCallback = (step: StepWithContent) => void | Promise<void>;
export type StepChunkCallback = (chunk: any) => void | Promise<void>;

export interface GenerateTextOptions<TModel> {
  messages: BaseMessage[];
  model: TModel;
  tools?: BaseTool[];
  maxSteps?: number;
  provider?: ProviderOptions;
  onStepFinish?: StepFinishCallback;
  signal?: AbortSignal;
}

export interface StreamTextOptions<TModel> {
  messages: BaseMessage[];
  model: TModel;
  tools?: BaseTool[];
  maxSteps?: number;
  provider?: ProviderOptions;
  onStepFinish?: StepFinishCallback;
  onChunk?: StepChunkCallback;
  onFinish?: StreamTextOnFinishCallback;
  onError?: StreamOnErrorCallback;
  signal?: AbortSignal;
}

export interface GenerateObjectOptions<TModel, TSchema extends z.ZodType> {
  messages: BaseMessage[];
  model: TModel;
  schema: TSchema;
  provider?: ProviderOptions;
  onStepFinish?: StepFinishCallback;
  signal?: AbortSignal;
}

export interface StreamObjectOptions<TModel, TSchema extends z.ZodType> {
  messages: BaseMessage[];
  model: TModel;
  schema: TSchema;
  provider?: ProviderOptions;
  onStepFinish?: StepFinishCallback;
  onFinish?: StreamObjectOnFinishCallback<z.infer<TSchema>>;
  onError?: StreamOnErrorCallback;
  signal?: AbortSignal;
}

// Utility types to infer provider-specific types
export type InferStreamResponse<T> = T extends {
  streamText: (...args: any[]) => Promise<infer R>;
}
  ? R
  : unknown;

export type InferMessage<T> = T extends {
  toMessage: (message: BaseMessage) => infer R;
}
  ? R
  : unknown;

export type InferTool<T> = T extends {
  toTool?: (tool: BaseTool) => infer R;
}
  ? R
  : unknown;

export type InferModel<T> = T extends {
  model: infer R;
}
  ? R
  : unknown;

export type InferGenerateTextResponse<T> = T extends {
  generateText: (...args: any[]) => Promise<infer R>;
}
  ? R
  : unknown;

export type InferGenerateObjectResponse<T> = T extends {
  generateObject: (...args: any[]) => Promise<infer R>;
}
  ? R
  : unknown;

export type InferProviderParams<T> = T extends {
  generateText: (options: infer P) => any;
}
  ? P extends {
      messages: any;
      model: any;
      tools?: any;
      maxSteps?: any;
      schema?: any;
    }
    ? Omit<P, "messages" | "model" | "tools" | "maxSteps" | "schema">
    : Record<string, never>
  : Record<string, never>;

export type LLMProvider<TProvider> = {
  /**
   * Generates a text response based on the provided options.
   * Implementers should catch underlying SDK/API errors and throw a VoltAgentError.
   * @throws {VoltAgentError} If an error occurs during generation.
   */
  generateText(
    options: GenerateTextOptions<InferModel<TProvider>>,
  ): Promise<ProviderTextResponse<InferGenerateTextResponse<TProvider>>>;

  /**
   * Streams a text response based on the provided options.
   * Implementers should catch underlying SDK/API errors and throw a VoltAgentError.
   * @throws {VoltAgentError} If an error occurs during streaming.
   */
  streamText(
    options: StreamTextOptions<InferModel<TProvider>>,
  ): Promise<ProviderTextStreamResponse<InferStreamResponse<TProvider>>>;

  /**
   * Generates a structured object response based on the provided options and schema.
   * Implementers should catch underlying SDK/API errors and throw a VoltAgentError.
   * @throws {VoltAgentError} If an error occurs during generation.
   */
  generateObject<TSchema extends z.ZodType>(
    options: GenerateObjectOptions<InferModel<TProvider>, TSchema>,
  ): Promise<ProviderObjectResponse<InferGenerateObjectResponse<TProvider>, z.infer<TSchema>>>;

  /**
   * Streams a structured object response based on the provided options and schema.
   * Implementers should catch underlying SDK/API errors and throw a VoltAgentError.
   * @throws {VoltAgentError} If an error occurs during streaming.
   */
  streamObject<TSchema extends z.ZodType>(
    options: StreamObjectOptions<InferModel<TProvider>, TSchema>,
  ): Promise<ProviderObjectStreamResponse<InferStreamResponse<TProvider>, z.infer<TSchema>>>;

  /**
   * Converts a base message to a provider-specific message.
   * @param message The base message to convert.
   * @returns The provider-specific message.
   */
  toMessage(message: BaseMessage): InferMessage<TProvider>;

  /**
   * Optional tool conversion method.
   */
  toTool?: (tool: BaseTool) => InferTool<TProvider>;

  /**
   * Returns a string representation of the model identifier.
   * @param model The model object/identifier specific to this provider.
   * @returns The string name of the model.
   */
  getModelIdentifier(model: InferModel<TProvider>): string;
};

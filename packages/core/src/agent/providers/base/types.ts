import type { z } from "zod";
import type { Tool } from "../../../tool";
import type {
  OperationContext,
  ProviderOptions,
  StreamObjectOnFinishCallback,
  StreamOnErrorCallback,
  StreamTextOnFinishCallback,
  ToolExecutionContext,
} from "../../types";

/**
 * Token usage information
 */
export type UsageInfo = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
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
  textStream: ReadableStream<string>;
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
  objectStream: ReadableStream<Partial<TObject>>;
};

/**
 * Data content type for binary data
 */
export type DataContent = string | Uint8Array | ArrayBuffer | Buffer;

/**
 * Text part of a message
 */
export type TextPart = {
  type: "text";
  /**
   * The text content
   */
  text: string;
};

/**
 * Image part of a message
 */
export type ImagePart = {
  type: "image";
  /**
   * Image data. Can either be:
   * - data: a base64-encoded string, a Uint8Array, an ArrayBuffer, or a Buffer
   * - URL: a URL that points to the image
   */
  image: DataContent | URL;
  /**
   * Optional mime type of the image
   */
  mimeType?: string;
};

/**
 * File part of a message
 */
export type FilePart = {
  type: "file";
  /**
   * File data. Can either be:
   * - data: a base64-encoded string, a Uint8Array, an ArrayBuffer, or a Buffer
   * - URL: a URL that points to the file
   */
  data: DataContent | URL;
  /**
   * Optional filename of the file
   */
  filename?: string;
  /**
   * Mime type of the file
   */
  mimeType: string;
};

/**
 * Message content can be either a string or an array of parts
 */
export type MessageContent = string | Array<TextPart | ImagePart | FilePart>;

/**
 * Message role types
 */
export type MessageRole = "user" | "assistant" | "system" | "tool";

/**
 * Base message type
 */
export type BaseMessage = {
  role: MessageRole;
  content: MessageContent;
};

// Schema types
export type ToolSchema = z.ZodType;

// Base tool types
export type ToolExecuteOptions = {
  /**
   * Optional AbortSignal to abort the execution
   */
  signal?: AbortSignal;

  /**
   * The operation context associated with the agent invocation triggering this tool execution.
   * Provides access to operation-specific state like userContext.
   */
  operationContext?: OperationContext;

  /**
   * Additional options can be added in the future
   */
  [key: string]: any;
};

export type BaseTool = Tool<any>;

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
  toolExecutionContext?: ToolExecutionContext;
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
  toolExecutionContext?: ToolExecutionContext;
}

export interface GenerateObjectOptions<TModel, TSchema extends z.ZodType> {
  messages: BaseMessage[];
  model: TModel;
  schema: TSchema;
  provider?: ProviderOptions;
  onStepFinish?: StepFinishCallback;
  signal?: AbortSignal;
  toolExecutionContext?: ToolExecutionContext;
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
  toolExecutionContext?: ToolExecutionContext;
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

// Base provider type
export type LLMProvider<TProvider> = {
  // Core methods
  /**
   * Generates a text response based on the provided options.
   * Implementers should catch underlying SDK/API errors and throw a VoltAgentError.
   * @throws {VoltAgentError} If an error occurs during generation.
   */
  generateText(
    options: GenerateTextOptions<InferModel<TProvider>>,
  ): Promise<ProviderTextResponse<InferGenerateTextResponse<TProvider>>>;

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

  streamObject<TSchema extends z.ZodType>(
    options: StreamObjectOptions<InferModel<TProvider>, TSchema>,
  ): Promise<ProviderObjectStreamResponse<InferStreamResponse<TProvider>, z.infer<TSchema>>>;

  // Message conversion methods
  toMessage(message: BaseMessage): InferMessage<TProvider>;

  // Optional tool conversion method
  toTool?: (tool: BaseTool) => InferTool<TProvider>;

  /**
   * Returns a string representation of the model identifier.
   * @param model The model object/identifier specific to this provider.
   * @returns The string name of the model.
   */
  getModelIdentifier(model: InferModel<TProvider>): string;
};

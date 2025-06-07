import type { AnthropicToolCall } from "@/types";
import { APIError } from "@anthropic-ai/sdk";
import type { ContentBlock, Message, Usage } from "@anthropic-ai/sdk/resources/messages";
import type { ContentBlockParam } from "@anthropic-ai/sdk/resources/messages";
import type {
  BaseMessage,
  GenerateTextOptions,
  MessageRole,
  ProviderTextResponse,
  StepWithContent,
  VoltAgentError,
} from "@voltagent/core";

/**
 * Processes text content into a text content block
 * @param {string} text - The text content to process
 * @returns {ContentBlockParam} A content block with type "text"
 */
export function processTextContent(text: string): ContentBlockParam {
  return {
    type: "text",
    text,
  };
}

/**
 * Processes image content into an image content block
 * @param {any} image - The image content to process (URL, data URI, or base64 string)
 * @param {string} [mimeType] - Optional MIME type for the image
 * @returns {ContentBlockParam|null} A content block with type "image" or null if format is unsupported
 */
export function processImageContent(image: any, mimeType?: string): ContentBlockParam | null {
  // Handle URL objects
  if (image instanceof URL) {
    return {
      type: "image",
      source: {
        type: "url",
        url: image.toString(),
      },
    };
  }

  // Handle string-type image data
  if (typeof image === "string") {
    return processStringImage(image, mimeType);
  }

  console.warn("Unsupported image format in AnthropicProvider");
  return null;
}

/**
 * Processes string-format image data (base64 or data URI)
 * @param {string} image - The image string (either data URI or base64)
 * @param {string} [mimeType] - Optional MIME type for the image, used when image is direct base64
 * @returns {ContentBlockParam|null} A content block with type "image" or null if format is invalid
 */
export function processStringImage(image: string, mimeType?: string): ContentBlockParam | null {
  // Parse data URI
  if (image.startsWith("data:")) {
    const matches = image.match(/^data:([^;]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const mediaType = matches[1];
      const data = matches[2];

      return createImageBlock(mediaType, data);
    }
    console.warn("Invalid data URI format in AnthropicProvider");
    return null;
  }

  // Handle base64 string
  const mediaType = mimeType || "image/jpeg";
  return createImageBlock(mediaType, image);
}

/**
 * Creates an image block with the given media type and data
 * @param {string} mediaType - The MIME type of the image (e.g., image/jpeg)
 * @param {string} data - The base64 encoded image data
 * @returns {ContentBlockParam|null} A content block with type "image" or null if media type is unsupported
 */
export function createImageBlock(mediaType: string, data: string): ContentBlockParam | null {
  if (isSupportedImageType(mediaType)) {
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        data,
      },
    };
  }
  console.warn(`Unsupported image format in AnthropicProvider: ${mediaType}`);
  return null;
}

/**
 * Processes file content into a text content block
 * @param {any} file - The file object with filename and mimeType properties
 * @returns {ContentBlockParam} A content block with type "text" describing the file
 */
export function processFileContent(file: any): ContentBlockParam {
  const filename = file.filename || "unnamed";
  const mimeType = file.mimeType || "application/octet-stream";

  return {
    type: "text",
    text: `[File: ${filename} (${mimeType})]`,
  };
}

/**
 * Checks if the given media type is supported by Anthropic's API
 * @param {string} mediaType - The MIME type to check
 * @returns {boolean} True if the media type is supported, false otherwise
 */
export function isSupportedImageType(mediaType: string): boolean {
  return ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mediaType);
}

/**
 * Processes any content type into Anthropic's content format
 * @param {any} content - The content to process (string, array, or other)
 * @returns {ContentBlockParam[]|string} Array of content blocks or string depending on input
 */
export function processContent(content: any): ContentBlockParam[] | string {
  // Handle string content
  if (typeof content === "string") {
    return content;
  }

  // Handle array content (multimodal)
  if (Array.isArray(content)) {
    const contentBlocks: ContentBlockParam[] = [];

    for (const part of content) {
      const block = processContentPart(part);
      if (block) {
        contentBlocks.push(block);
      }
    }

    return contentBlocks;
  }

  // Fallback for any other content format
  return String(content);
}

/**
 * Processes a single content part into an appropriate content block
 * @param {any} part - The content part object with type and data
 * @returns {ContentBlockParam|null} A content block of appropriate type or null if unsupported
 */
export function processContentPart(part: any): ContentBlockParam | null {
  if (part.type === "text") {
    return processTextContent(part.text);
  }

  if (part.type === "image") {
    return processImageContent(part.image, part.mimeType);
  }

  if (part.type === "file") {
    return processFileContent(part);
  }

  return null;
}

/**
 * Creates a response object from Anthropic's response
 * @param {Message} response - The response from Anthropic
 * @param {string} responseText - The extracted text from the response
 * @param {AnthropicToolCall[]} toolCalls - Tool calls extracted from the response
 * @returns {ProviderTextResponse<any>} A standardized provider response object
 */
export function createResponseObject(
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

/**
 * Creates a step from a chunk of data
 * @param {Object} chunk - The chunk to convert to a step
 * @param {string} chunk.type - The type of the chunk
 * @param {any} chunk[key] - Additional properties of the chunk
 * @returns {StepWithContent|null} A step with content or null if chunk type is unsupported
 */
export function createStepFromChunk(chunk: {
  type: string;
  [key: string]: any;
}): StepWithContent | null {
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
}

/**
 * Handles the step finish callback for text and tool calls
 * @param {GenerateTextOptions<string>} options - The options passed to the generate function
 * @param {string} responseText - The text response
 * @param {AnthropicToolCall[]} toolCalls - The extracted tool calls
 * @param {Usage} [usage] - Optional usage information
 * @returns {Promise<void>} A promise that resolves when all callbacks are complete
 */
export async function handleStepFinish(
  options: GenerateTextOptions<string>,
  responseText: string,
  toolCalls: AnthropicToolCall[],
  usage?: Usage,
): Promise<void> {
  if (!options.onStepFinish) return;

  if (responseText) {
    const step = createStepFromChunk({
      type: "text",
      text: responseText,
      usage,
    });
    if (step) await options.onStepFinish(step);
  }

  for (const toolCall of toolCalls) {
    const step = createStepFromChunk({
      type: "tool-call",
      toolCallId: toolCall.toolCallId,
      toolName: toolCall.toolName,
      args: toolCall.args,
      usage,
    });
    if (step) await options.onStepFinish(step);
  }
}

/**
 * Processes the content array from Anthropic's response
 * @param {ContentBlock[]} content - The content blocks from Anthropic's response
 * @returns {Object} An object with responseText and toolCalls extracted from content
 */
export function processResponseContent(content: ContentBlock[]): {
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

/**
 * Generates a standardized error object from various error types
 * @param {string} message - The error message
 * @param {unknown} error - The original error
 * @param {string} stage - The stage where the error occurred (e.g., "llm_generate")
 * @returns {VoltAgentError} A standardized error object
 */
export function generateVoltError(message: string, error: unknown, stage: string): VoltAgentError {
  if (error instanceof APIError) {
    if (error.error.type === "error") {
      return {
        message: error.error.error.message || message,
        originalError: error,
        code: error.status,
        metadata: {
          request_id: error.request_id,
          headers: error.headers,
          cause: error.cause,
        },
        stage,
      };
    }
    return {
      message,
      originalError: error,
      code: error.status,
      metadata: {
        request_id: error.request_id,
        headers: error.headers,
        cause: error.cause,
      },
      stage,
    };
  }

  return {
    message,
    originalError: error,
    stage,
  };
}

/**
 * Extracts system messages from an array of messages
 * @param {BaseMessage[]} messages - The array of messages to process
 * @returns {string} The concatenated content of all system messages
 */
export function getSystemMessage(messages: BaseMessage[]): string {
  return messages
    .map((message) => (message.role === "system" ? String(message.content) : ""))
    .join(" ");
}

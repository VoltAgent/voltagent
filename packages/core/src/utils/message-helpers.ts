import type { FileUIPart, TextUIPart, UIMessage } from "ai";
import type { MessageContent } from "../agent/providers/base/types";

/**
 * Type guard to check if content is a string
 */
export function isTextContent(content: MessageContent): content is string {
  return typeof content === "string";
}

/**
 * Type guard to check if content is structured (array of content parts)
 */
export function isStructuredContent(content: MessageContent): content is Array<any> {
  return Array.isArray(content);
}

/**
 * Check if content or message has any text parts
 * @param input - MessageContent or UIMessage
 * @returns True if has text parts
 */
export function hasTextPart(content: MessageContent): boolean;
export function hasTextPart(message: UIMessage): boolean;
export function hasTextPart(input: MessageContent | UIMessage): boolean {
  // Handle UIMessage
  if (isUIMessage(input)) {
    if (!input.parts || !Array.isArray(input.parts)) {
      return false;
    }
    return input.parts.some((part) => part?.type === "text");
  }

  // Handle MessageContent
  if (isTextContent(input)) return true;
  if (isStructuredContent(input)) {
    return input.some((part) => part.type === "text");
  }
  return false;
}

/**
 * Check if content or message has any image parts
 * @param input - MessageContent or UIMessage
 * @returns True if has image parts
 */
export function hasImagePart(content: MessageContent): boolean;
export function hasImagePart(message: UIMessage): boolean;
export function hasImagePart(input: MessageContent | UIMessage): boolean {
  // Handle UIMessage
  if (isUIMessage(input)) {
    if (!input.parts || !Array.isArray(input.parts)) {
      return false;
    }
    return input.parts.some(
      (part) =>
        part?.type === "file" &&
        typeof (part as FileUIPart).mediaType === "string" &&
        (part as FileUIPart).mediaType.startsWith("image/"),
    );
  }

  // Handle MessageContent
  if (isStructuredContent(input)) {
    return input.some((part) => part.type === "image");
  }
  return false;
}

/**
 * Check if content or message has any file parts
 * @param input - MessageContent or UIMessage
 * @returns True if has file parts
 */
export function hasFilePart(content: MessageContent): boolean;
export function hasFilePart(message: UIMessage): boolean;
export function hasFilePart(input: MessageContent | UIMessage): boolean {
  // Handle UIMessage
  if (isUIMessage(input)) {
    if (!input.parts || !Array.isArray(input.parts)) {
      return false;
    }
    return input.parts.some((part) => part?.type === "file");
  }

  // Handle MessageContent
  if (isStructuredContent(input)) {
    return input.some((part) => part.type === "file");
  }
  return false;
}

/**
 * Extract text from message content or UIMessage
 * @param input - MessageContent (from ModelMessage.content) or UIMessage object
 * @returns All text content joined together
 * @example
 * // From MessageContent
 * const content = [{ type: "text", text: "Hello" }];
 * extractText(content); // "Hello"
 *
 * // From UIMessage
 * const message = { id: "1", role: "user", parts: [{ type: "text", text: "Hi" }] };
 * extractText(message); // "Hi"
 */
export function extractText(content: MessageContent): string;
export function extractText(message: UIMessage): string;
export function extractText(input: MessageContent | UIMessage): string {
  // Handle UIMessage
  if (isUIMessage(input)) {
    if (!input.parts || !Array.isArray(input.parts)) {
      return "";
    }
    return input.parts
      .filter((part): part is TextUIPart => part?.type === "text")
      .map((part) => part.text)
      .join("");
  }

  // Handle MessageContent (string or array)
  if (isTextContent(input)) {
    return input;
  }

  if (isStructuredContent(input)) {
    return input
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");
  }

  return "";
}

/**
 * Extract all text parts from structured content or UIMessage
 * @param input - MessageContent or UIMessage
 * @returns Array of text parts
 */
export function extractTextParts(content: MessageContent): Array<{ type: "text"; text: string }>;
export function extractTextParts(message: UIMessage): TextUIPart[];
export function extractTextParts(input: MessageContent | UIMessage): Array<any> {
  // Handle UIMessage
  if (isUIMessage(input)) {
    if (!input.parts || !Array.isArray(input.parts)) {
      return [];
    }
    return input.parts.filter((part): part is TextUIPart => part?.type === "text");
  }

  // Handle MessageContent
  if (isStructuredContent(input)) {
    return input.filter((part) => part.type === "text");
  }
  if (isTextContent(input)) {
    return [{ type: "text", text: input }];
  }
  return [];
}

/**
 * Extract image parts from message content or UIMessage
 * @param input - MessageContent or UIMessage
 * @returns Array of image parts (FileUIPart for UIMessage)
 */
export function extractImageParts(content: MessageContent): Array<any>;
export function extractImageParts(message: UIMessage): FileUIPart[];
export function extractImageParts(input: MessageContent | UIMessage): Array<any> {
  // Handle UIMessage
  if (isUIMessage(input)) {
    if (!input.parts || !Array.isArray(input.parts)) {
      return [];
    }
    return input.parts.filter(
      (part): part is FileUIPart =>
        part?.type === "file" &&
        typeof (part as FileUIPart).mediaType === "string" &&
        (part as FileUIPart).mediaType.startsWith("image/"),
    );
  }

  // Handle MessageContent
  if (isStructuredContent(input)) {
    return input.filter((part) => part.type === "image");
  }
  return [];
}

/**
 * Extract file parts from message content or UIMessage
 * @param input - MessageContent or UIMessage
 * @returns Array of file parts
 */
export function extractFileParts(content: MessageContent): Array<any>;
export function extractFileParts(message: UIMessage): FileUIPart[];
export function extractFileParts(input: MessageContent | UIMessage): Array<any> {
  // Handle UIMessage
  if (isUIMessage(input)) {
    if (!input.parts || !Array.isArray(input.parts)) {
      return [];
    }
    return input.parts.filter((part): part is FileUIPart => part?.type === "file");
  }

  // Handle MessageContent
  if (isStructuredContent(input)) {
    return input.filter((part) => part.type === "file");
  }
  return [];
}

/**
 * Transform text content in a message
 */
export function transformTextContent(
  content: MessageContent,
  transformer: (text: string) => string,
): MessageContent {
  if (isTextContent(content)) {
    return transformer(content);
  }

  if (isStructuredContent(content)) {
    return content.map((part) => {
      if (part.type === "text") {
        return { ...part, text: transformer((part as { type: "text"; text: string }).text) };
      }
      return part;
    }) as MessageContent;
  }

  return content;
}

/**
 * Map UIMessage text parts with a transformer function
 */
export function mapMessageContent(
  message: UIMessage,
  transformer: (text: string) => string,
): UIMessage {
  if (!Array.isArray((message as any).parts)) return message as UIMessage;
  const parts = (message as any).parts.map((part: any) => {
    if (part?.type === "text" && typeof part.text === "string") {
      return { ...part, text: transformer(part.text) };
    }
    return part;
  });
  return { ...(message as any), parts } as UIMessage;
}

/**
 * Filter content parts by type
 */
export function filterContentParts(
  content: MessageContent,
  predicate: (part: any) => boolean,
): MessageContent {
  if (isStructuredContent(content)) {
    const filtered = content.filter(predicate);
    if (filtered.length === 0) return "";
    if (filtered.length === 1 && filtered[0].type === "text") {
      return (filtered[0] as { type: "text"; text: string }).text;
    }
    return filtered as MessageContent;
  }
  return content;
}

/**
 * Normalize content to always be an array
 */
export function normalizeToArray(content: MessageContent): Array<any> {
  if (isTextContent(content)) {
    return [{ type: "text", text: content }];
  }
  if (isStructuredContent(content)) {
    return content;
  }
  return [];
}

/**
 * Normalize content to the most compact form
 */
export function normalizeContent(content: MessageContent): MessageContent {
  if (isStructuredContent(content)) {
    if (content.length === 0) return "";
    if (content.length === 1 && content[0].type === "text") {
      return content[0].text;
    }
  }
  return content;
}

/**
 * Builder class for creating message content
 */
export class MessageContentBuilder {
  private parts: Array<any> = [];

  /**
   * Add a text part
   */
  addText(text: string): this {
    this.parts.push({ type: "text", text });
    return this;
  }

  /**
   * Add an image part
   */
  addImage(image: string | Uint8Array): this {
    this.parts.push({ type: "image", image });
    return this;
  }

  /**
   * Add a file part
   */
  addFile(file: string | Uint8Array, mimeType?: string): this {
    this.parts.push({ type: "file", data: file, mimeType });
    return this;
  }

  /**
   * Add a custom part
   */
  addPart(part: any): this {
    this.parts.push(part);
    return this;
  }

  /**
   * Build the final content
   */
  build(): MessageContent {
    return normalizeContent(this.parts);
  }

  /**
   * Build as array (always returns array)
   */
  buildAsArray(): Array<any> {
    return this.parts;
  }

  /**
   * Clear all parts
   */
  clear(): this {
    this.parts = [];
    return this;
  }

  /**
   * Get current parts count
   */
  get length(): number {
    return this.parts.length;
  }
}

/**
 * Convenience function to add timestamp to user messages (UIMessage only)
 */
export function addTimestampToMessage(message: UIMessage, timestamp?: string): UIMessage {
  if (message.role !== "user") return message;

  const ts = timestamp || new Date().toLocaleTimeString();

  // Prefix all text parts with the timestamp
  if (Array.isArray(message.parts)) {
    const newParts = message.parts.map((part: any) => {
      if (part?.type === "text" && typeof part.text === "string") {
        return { ...part, text: `[${ts}] ${part.text}` };
      }
      return part;
    });
    return { ...(message as any), parts: newParts } as UIMessage;
  }

  // If parts are missing (unexpected), return unchanged
  return message;
}

/**
 * Convenience function to prepend text to UIMessage text parts
 */
export function prependToMessage(message: UIMessage, prefix: string): UIMessage {
  if (!Array.isArray((message as any).parts)) return message as UIMessage;
  const parts = (message as any).parts.map((part: any) => {
    if (part?.type === "text" && typeof part.text === "string") {
      return { ...part, text: `${prefix}${part.text}` };
    }
    return part;
  });
  return { ...(message as any), parts } as UIMessage;
}

/**
 * Convenience function to append text to UIMessage text parts
 */
export function appendToMessage(message: UIMessage, suffix: string): UIMessage {
  if (!Array.isArray((message as any).parts)) return message as UIMessage;
  const parts = (message as any).parts.map((part: any) => {
    if (part?.type === "text" && typeof part.text === "string") {
      return { ...part, text: `${part.text}${suffix}` };
    }
    return part;
  });
  return { ...(message as any), parts } as UIMessage;
}

/**
 * Check if UIMessage has any content
 */
export function hasContent(message: UIMessage): boolean {
  const parts = (message as any)?.parts;
  if (!Array.isArray(parts) || parts.length === 0) return false;
  // True if any non-empty text part or any non-text part exists
  for (const part of parts) {
    if (part?.type === "text" && typeof part.text === "string" && part.text.length > 0) return true;
    if (part?.type !== "text") return true;
  }
  return false;
}

/**
 * Get content length (text characters, array items, or UIMessage parts count)
 * @param input - MessageContent or UIMessage
 * @returns Length/count of content
 */
export function getContentLength(content: MessageContent): number;
export function getContentLength(message: UIMessage): number;
export function getContentLength(input: MessageContent | UIMessage): number {
  // Handle UIMessage
  if (isUIMessage(input)) {
    if (!input.parts || !Array.isArray(input.parts)) {
      return 0;
    }
    return input.parts.length;
  }

  // Handle MessageContent
  if (isTextContent(input)) return input.length;
  if (isStructuredContent(input)) return input.length;
  return 0;
}

// ============================================================================
// Helper to detect UIMessage vs MessageContent
// ============================================================================

/**
 * Type guard to check if input is a UIMessage
 */
function isUIMessage(input: any): input is UIMessage {
  return (
    input &&
    typeof input === "object" &&
    "parts" in input &&
    "role" in input &&
    Array.isArray(input.parts)
  );
}

/**
 * Combined message helpers object for easy importing
 * All functions now support both MessageContent and UIMessage formats
 */
export const messageHelpers = {
  // Type guards
  isTextContent,
  isStructuredContent,
  hasTextPart,
  hasImagePart,
  hasFilePart,

  // Extractors - work with both MessageContent and UIMessage
  extractText,
  extractTextParts,
  extractImageParts,
  extractFileParts,

  // Transformers
  transformTextContent,
  mapMessageContent,
  filterContentParts,

  // Normalizers
  normalizeToArray,
  normalizeContent,

  // Convenience functions
  addTimestampToMessage: addTimestampToMessage as typeof addTimestampToMessage,
  prependToMessage,
  appendToMessage,
  hasContent,
  getContentLength,

  // Builder
  MessageContentBuilder,
};

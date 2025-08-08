import type { BaseMessage, MessageContent } from "../agent/providers/base/types";

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
 * Check if content has any text parts
 */
export function hasTextPart(content: MessageContent): boolean {
  if (isTextContent(content)) return true;
  if (isStructuredContent(content)) {
    return content.some((part) => part.type === "text");
  }
  return false;
}

/**
 * Check if content has any image parts
 */
export function hasImagePart(content: MessageContent): boolean {
  if (isStructuredContent(content)) {
    return content.some((part) => part.type === "image");
  }
  return false;
}

/**
 * Check if content has any file parts
 */
export function hasFilePart(content: MessageContent): boolean {
  if (isStructuredContent(content)) {
    return content.some((part) => part.type === "file");
  }
  return false;
}

/**
 * Extract text from message content
 */
export function extractText(content: MessageContent): string {
  if (isTextContent(content)) {
    return content;
  }

  if (isStructuredContent(content)) {
    return content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");
  }

  return "";
}

/**
 * Extract all text parts from structured content
 */
export function extractTextParts(content: MessageContent): Array<{ type: "text"; text: string }> {
  if (isStructuredContent(content)) {
    return content.filter((part) => part.type === "text");
  }
  if (isTextContent(content)) {
    return [{ type: "text", text: content }];
  }
  return [];
}

/**
 * Extract image parts from message content
 */
export function extractImageParts(content: MessageContent): Array<any> {
  if (isStructuredContent(content)) {
    return content.filter((part) => part.type === "image");
  }
  return [];
}

/**
 * Extract file parts from message content
 */
export function extractFileParts(content: MessageContent): Array<any> {
  if (isStructuredContent(content)) {
    return content.filter((part) => part.type === "file");
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
        return { ...part, text: transformer(part.text) };
      }
      return part;
    });
  }

  return content;
}

/**
 * Map message content with a transformer function
 */
export function mapMessageContent<T extends BaseMessage>(
  message: T,
  transformer: (text: string) => string,
): T {
  return {
    ...message,
    content: transformTextContent(message.content, transformer),
  };
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
      return filtered[0].text;
    }
    return filtered;
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
 * Convenience function to add timestamp to user messages
 */
export function addTimestampToMessage(message: BaseMessage, timestamp?: string): BaseMessage {
  if (message.role !== "user") return message;

  const ts = timestamp || new Date().toLocaleTimeString();

  return {
    ...message,
    content: transformTextContent(message.content, (text) => `[${ts}] ${text}`),
  };
}

/**
 * Convenience function to prepend text to message content
 */
export function prependToMessage(message: BaseMessage, prefix: string): BaseMessage {
  return mapMessageContent(message, (text) => `${prefix}${text}`);
}

/**
 * Convenience function to append text to message content
 */
export function appendToMessage(message: BaseMessage, suffix: string): BaseMessage {
  return mapMessageContent(message, (text) => `${text}${suffix}`);
}

/**
 * Check if message has any content
 */
export function hasContent(message: BaseMessage): boolean {
  const content = message.content;
  if (isTextContent(content)) return content.length > 0;
  if (isStructuredContent(content)) return content.length > 0;
  return false;
}

/**
 * Get content length (text characters or array items)
 */
export function getContentLength(content: MessageContent): number {
  if (isTextContent(content)) return content.length;
  if (isStructuredContent(content)) return content.length;
  return 0;
}

/**
 * Combined message helpers object for easy importing
 */
export const messageHelpers = {
  // Type guards
  isTextContent,
  isStructuredContent,
  hasTextPart,
  hasImagePart,
  hasFilePart,

  // Extractors
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
  addTimestampToMessage,
  prependToMessage,
  appendToMessage,
  hasContent,
  getContentLength,

  // Builder
  MessageContentBuilder,
};

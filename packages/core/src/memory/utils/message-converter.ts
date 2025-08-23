import type { FileUIPart, TextUIPart, UIDataTypes, UIMessage, UIMessagePart, UITools } from "ai";
import { v4 as uuidv4 } from "uuid";
import type { BaseMessage } from "../../agent/providers/base/types";
import type { VoltMessageV2 } from "../types/v2-messages";

/**
 * Utility class for converting between different message formats
 */
export class MessageConverter {
  /**
   * Convert BaseMessage to VoltMessageV2
   */
  public baseMessageToV2(
    message: BaseMessage,
    conversationId: string,
    resourceId?: string,
  ): VoltMessageV2 {
    const id = uuidv4();
    const createdAt = new Date();

    // Convert content to UIMessagePart array
    const parts: UIMessagePart<UIDataTypes, UITools>[] = [];

    if (typeof message.content === "string") {
      // Simple text content
      const textPart: TextUIPart = {
        type: "text",
        text: message.content,
      };
      parts.push(textPart);
    } else if (Array.isArray(message.content)) {
      // Complex content array - only handles text, image, and file parts
      for (const item of message.content) {
        if (item.type === "text") {
          const textPart: TextUIPart = {
            type: "text",
            text: item.text,
          };
          parts.push(textPart);
        } else if (item.type === "image") {
          // Convert image to file part - handle different image data types
          let imageUrl: string;
          if (typeof item.image === "string") {
            imageUrl = item.image;
          } else if (item.image instanceof URL) {
            imageUrl = item.image.toString();
          } else {
            // For binary data (Uint8Array, ArrayBuffer, Buffer), create a data URL
            // This is a simplification - in production you might want to handle this differently
            imageUrl = "data:image/*;base64,";
          }

          const filePart: FileUIPart = {
            type: "file",
            mediaType: "image/*",
            url: imageUrl,
          };
          parts.push(filePart);
        } else if (item.type === "file") {
          // Handle file parts
          let fileUrl: string;
          const fileItem = item as {
            type: "file";
            data: string | URL | Uint8Array;
            mimeType?: string;
          };
          if (typeof fileItem.data === "string") {
            fileUrl = fileItem.data;
          } else if (fileItem.data instanceof URL) {
            fileUrl = fileItem.data.toString();
          } else {
            // For binary data, create a data URL
            fileUrl = "data:application/octet-stream;base64,";
          }

          const filePart: FileUIPart = {
            type: "file",
            mediaType: fileItem.mimeType || "application/octet-stream",
            url: fileUrl,
          };
          parts.push(filePart);
        }
      }
    }

    // Map the role - convert 'tool' role to 'assistant' if present
    const role =
      message.role === "tool" ? "assistant" : (message.role as "user" | "assistant" | "system");

    return {
      id,
      role,
      content: {
        format: 2,
        parts,
        metadata: undefined,
      },
      conversationId,
      resourceId,
      createdAt,
      type: "v2",
    };
  }

  /**
   * Convert VoltMessageV2 to AI SDK v5 UIMessage
   */
  public v2ToUIMessage(message: VoltMessageV2): UIMessage {
    return {
      id: message.id,
      role: message.role,
      parts: message.content.parts,
      metadata: message.content.metadata,
    };
  }

  /**
   * Convert AI SDK v5 UIMessage to VoltMessageV2
   */
  public uiMessageToV2(
    message: UIMessage,
    conversationId: string,
    resourceId?: string,
  ): VoltMessageV2 {
    return {
      id: message.id,
      role: message.role as "user" | "assistant" | "system",
      content: {
        format: 2,
        parts: message.parts,
        metadata: message.metadata as Record<string, unknown> | undefined,
      },
      conversationId,
      resourceId,
      createdAt: new Date(),
      type: "v2",
    };
  }

  /**
   * Check if a message is a UIMessage
   */
  public isUIMessage(message: unknown): message is UIMessage {
    return (
      typeof message === "object" &&
      message !== null &&
      "parts" in message &&
      Array.isArray((message as any).parts) &&
      "role" in message
    );
  }

  /**
   * Check if a message is a BaseMessage
   */
  public isBaseMessage(message: unknown): message is BaseMessage {
    return (
      typeof message === "object" && message !== null && "content" in message && "role" in message
    );
  }
}

import type { UIMessage, UIMessagePart } from "ai";

/**
 * VoltAgent V2 message content format, compatible with AI SDK v5 UIMessage
 * This format is used for internal storage and conversion
 */
export type VoltMessageContentV2 = {
  /**
   * Format version identifier
   * 2 = AI SDK v5 UIMessage compatible format
   */
  format: 2;

  /**
   * Message parts array, compatible with AI SDK v5 UIMessagePart
   * Includes text, tool, file, reasoning, and other part types
   */
  parts: UIMessagePart<any, any>[];

  /**
   * Optional metadata for the message content
   */
  metadata?: Record<string, unknown>;
};

/**
 * VoltAgent V2 message format for storage
 * Wraps AI SDK v5 UIMessage content with additional VoltAgent-specific fields
 */
export type VoltMessageV2 = {
  /**
   * Unique identifier for the message
   */
  id: string;

  /**
   * Role of the message sender
   */
  role: "user" | "assistant" | "system";

  /**
   * Message content in V2 format
   */
  content: VoltMessageContentV2;

  /**
   * Associated conversation ID
   */
  conversationId: string;

  /**
   * Optional resource ID for additional context
   */
  resourceId?: string;

  /**
   * Creation timestamp
   */
  createdAt: Date;

  /**
   * Last update timestamp
   */
  updatedAt?: Date;

  /**
   * Format version identifier
   */
  type: "v2";
};

/**
 * Type guard to check if a message is in V2 format
 */
export function isVoltMessageV2(message: unknown): message is VoltMessageV2 {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    (message as any).type === "v2" &&
    "content" in message &&
    typeof (message as any).content === "object" &&
    "format" in (message as any).content &&
    (message as any).content.format === 2
  );
}

/**
 * Convert UIMessage to VoltMessageV2 for storage
 */
export function uiMessageToVoltV2(
  message: UIMessage,
  conversationId: string,
  resourceId?: string,
): VoltMessageV2 {
  return {
    id: message.id,
    role: message.role,
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
 * Convert VoltMessageV2 to UIMessage for AI SDK compatibility
 */
export function voltV2ToUIMessage(message: VoltMessageV2): UIMessage {
  return {
    id: message.id,
    role: message.role,
    parts: message.content.parts,
    metadata: message.content.metadata,
  };
}

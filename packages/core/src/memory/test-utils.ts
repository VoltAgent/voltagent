/**
 * Test utilities for Memory V2 tests
 */

import { safeStringify } from "@voltagent/internal";
import type { UIMessage } from "ai";
import type { Conversation, CreateConversationInput } from "./types";

/**
 * Create a test UIMessage with optional overrides
 */
export function createTestUIMessage(overrides?: Partial<UIMessage>): UIMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    role: "user",
    parts: [{ type: "text", text: "Test message" }],
    ...overrides,
  };
}

/**
 * Create multiple test messages
 */
export function createTestMessages(
  count: number,
  role: "user" | "assistant" = "user",
): UIMessage[] {
  return Array.from({ length: count }, (_, i) =>
    createTestUIMessage({
      id: `msg-${i}`,
      role: i % 2 === 0 ? role : role === "user" ? "assistant" : "user",
      parts: [{ type: "text", text: `Message ${i + 1}` }],
    }),
  );
}

/**
 * Create a test conversation input
 */
export function createTestConversation(
  overrides?: Partial<CreateConversationInput>,
): CreateConversationInput {
  return {
    id: `conv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    userId: "test-user",
    resourceId: "test-resource",
    title: "Test Conversation",
    metadata: {},
    ...overrides,
  };
}

/**
 * Create multiple test conversations
 */
export function createTestConversations(count: number): CreateConversationInput[] {
  return Array.from({ length: count }, (_, i) =>
    createTestConversation({
      id: `conv-${i}`,
      title: `Conversation ${i + 1}`,
    }),
  );
}

/**
 * Extract text content from a UIMessage
 */
export function extractMessageText(message: UIMessage): string | null {
  const textPart = message.parts?.find((part) => part.type === "text");
  return textPart?.type === "text" ? textPart.text : null;
}

/**
 * Extract text content from multiple messages
 */
export function extractMessageTexts(messages: UIMessage[]): (string | null)[] {
  return messages.map(extractMessageText);
}

/**
 * Assert two conversations are equal
 */
export function assertConversationsEqual(actual: Conversation, expected: Conversation): void {
  // Compare all fields except dates which may have minor differences
  if (actual.id !== expected.id) throw new Error(`ID mismatch: ${actual.id} !== ${expected.id}`);
  if (actual.userId !== expected.userId) throw new Error("User ID mismatch");
  if (actual.resourceId !== expected.resourceId) throw new Error("Resource ID mismatch");
  if (actual.title !== expected.title) throw new Error("Title mismatch");
  if (safeStringify(actual.metadata) !== safeStringify(expected.metadata)) {
    throw new Error("Metadata mismatch");
  }
}

/**
 * Assert two message arrays are equal
 */
export function assertMessagesEqual(actual: UIMessage[], expected: UIMessage[]): void {
  if (actual.length !== expected.length) {
    throw new Error(`Message count mismatch: ${actual.length} !== ${expected.length}`);
  }

  for (let i = 0; i < actual.length; i++) {
    const a = actual[i];
    const e = expected[i];
    if (a.id !== e.id) throw new Error(`Message ${i} ID mismatch`);
    if (a.role !== e.role) throw new Error(`Message ${i} role mismatch`);
    if (safeStringify(a.parts) !== safeStringify(e.parts)) {
      throw new Error(`Message ${i} parts mismatch`);
    }
  }
}

// Re-export InMemory adapter for convenience
export { InMemoryStorageAdapter } from "./adapters/storage/in-memory";

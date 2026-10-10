import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { InMemoryStorageAdapter } from "./in-memory";

const message: UIMessage = {
  id: "message",
  role: "user",
  parts: [{ type: "text", text: "Hello" }],
};

describe("InMemoryStorageAdapter string identifiers", () => {
  it.each(["constructor", "toString", "__proto__"])(
    "keeps messages isolated when a user identifier is %s",
    async (userId) => {
      const adapter = new InMemoryStorageAdapter();
      expect(await adapter.getMessages(userId, "constructor")).toEqual([]);
      await adapter.addMessage(message, userId, "conversation");
      expect(await adapter.getMessages(userId, "conversation")).toHaveLength(1);
      expect(await adapter.getMessages("another-user", "conversation")).toEqual([]);
      expect(adapter.getStats()).toMatchObject({ totalUsers: 1, totalMessages: 1 });

      await adapter.clearMessages(userId);
      await adapter.addMessage(message, userId, "conversation");
      expect(await adapter.getMessages(userId, "conversation")).toHaveLength(1);
      adapter.clear();
      await adapter.addMessage(message, userId, "conversation");
      expect(adapter.getStats()).toMatchObject({ totalUsers: 1, totalMessages: 1 });
    },
  );

  it.each(["constructor", "toString", "__proto__"])(
    "supports a conversation identifier named %s through message CRUD",
    async (conversationId) => {
      const adapter = new InMemoryStorageAdapter();
      expect(await adapter.getMessages("user", conversationId)).toEqual([]);
      await adapter.deleteMessages([message.id], "user", conversationId);
      await adapter.addMessage(message, "user", conversationId);
      expect(await adapter.getMessages("user", conversationId)).toHaveLength(1);
      await adapter.deleteMessages([message.id], "user", conversationId);
      expect(await adapter.getMessages("user", conversationId)).toEqual([]);
      await adapter.addMessage(message, "user", conversationId);
      await adapter.clearMessages("user", conversationId);
      expect(await adapter.getMessages("user", conversationId)).toEqual([]);
      await adapter.clearMessages("user");
      await adapter.addMessage(message, "user", conversationId);
      expect(await adapter.getMessages("user", conversationId)).toHaveLength(1);
      adapter.clear();
      await adapter.addMessage(message, "user", conversationId);
      expect(await adapter.getMessages("user", conversationId)).toHaveLength(1);
    },
  );
});

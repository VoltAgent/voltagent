import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { InMemoryStorageAdapter } from "./adapters/storage/in-memory";
import { Memory } from "./index";

describe("Memory V2 - Working Memory", () => {
  let memory: Memory;
  let storage: InMemoryStorageAdapter;

  describe("Basic Working Memory Operations", () => {
    beforeEach(() => {
      storage = new InMemoryStorageAdapter();
      memory = new Memory({
        storage,
        workingMemory: {
          enabled: true,
          scope: "conversation",
        },
      });
    });

    it("should save and retrieve working memory for a conversation", async () => {
      const conversationId = "conv-123";
      const userId = "user-123";
      const content = "Important context: User prefers detailed explanations";

      // Create conversation first
      await memory.createConversation({
        id: conversationId,
        userId,
        resourceId: "resource-123",
        title: "Test Conversation",
        metadata: {},
      });

      // Save working memory
      await memory.updateWorkingMemory({
        conversationId,
        userId,
        content,
      });

      // Retrieve working memory
      const retrieved = await memory.getWorkingMemory({
        conversationId,
        userId,
      });

      expect(retrieved).toBe(content);
    });

    it("should return null when no working memory exists", async () => {
      const result = await memory.getWorkingMemory({
        conversationId: "non-existent",
        userId: "user-123",
      });

      expect(result).toBeNull();
    });

    it("should clear working memory", async () => {
      const conversationId = "conv-123";
      const userId = "user-123";

      // Create conversation first
      await memory.createConversation({
        id: conversationId,
        userId,
        resourceId: "resource-123",
        title: "Test Conversation",
        metadata: {},
      });

      // Save working memory
      await memory.updateWorkingMemory({
        conversationId,
        userId,
        content: "Some content",
      });

      // Clear working memory
      await memory.clearWorkingMemory({
        conversationId,
        userId,
      });

      // Verify it's cleared
      const result = await memory.getWorkingMemory({
        conversationId,
        userId,
      });

      expect(result).toBeNull();
    });

    it("should update existing working memory", async () => {
      const conversationId = "conv-123";
      const userId = "user-123";

      // Create conversation first
      await memory.createConversation({
        id: conversationId,
        userId,
        resourceId: "resource-123",
        title: "Test Conversation",
        metadata: {},
      });

      // Save initial content
      await memory.updateWorkingMemory({
        conversationId,
        userId,
        content: "Initial content",
      });

      // Update with new content
      await memory.updateWorkingMemory({
        conversationId,
        userId,
        content: "Updated content",
      });

      // Verify updated content
      const result = await memory.getWorkingMemory({
        conversationId,
        userId,
      });

      expect(result).toBe("Updated content");
    });
  });

  describe("Working Memory with Markdown Template", () => {
    beforeEach(() => {
      storage = new InMemoryStorageAdapter();
      memory = new Memory({
        storage,
        workingMemory: {
          enabled: true,
          scope: "conversation",
          template: "## User Preferences\n- {preference1}\n- {preference2}\n## Context\n{context}",
        },
      });
    });

    it("should get working memory template", () => {
      const template = memory.getWorkingMemoryTemplate();
      expect(template).toContain("## User Preferences");
      expect(template).toContain("{preference1}");
    });

    it("should detect markdown format", () => {
      const format = memory.getWorkingMemoryFormat();
      expect(format).toBe("markdown");
    });

    it("should save markdown content", async () => {
      const conversationId = "conv-123";
      const userId = "user-123";
      const content =
        "## User Preferences\n- Prefers code examples\n- Likes detailed explanations\n## Context\nWorking on a React project";

      // Create conversation first
      await memory.createConversation({
        id: conversationId,
        userId,
        resourceId: "resource-123",
        title: "Test Conversation",
        metadata: {},
      });

      await memory.updateWorkingMemory({
        conversationId,
        userId,
        content,
      });

      const retrieved = await memory.getWorkingMemory({
        conversationId,
        userId,
      });

      expect(retrieved).toBe(content);
    });
  });

  describe("Working Memory with JSON Schema", () => {
    const schema = z.object({
      preferences: z.array(z.string()),
      context: z.string(),
      settings: z.object({
        verbosity: z.enum(["low", "medium", "high"]),
        codeStyle: z.string().optional(),
      }),
    });

    beforeEach(() => {
      storage = new InMemoryStorageAdapter();
      memory = new Memory({
        storage,
        workingMemory: {
          enabled: true,
          scope: "conversation",
          schema,
        },
      });
    });

    it("should get working memory schema", () => {
      const retrievedSchema = memory.getWorkingMemorySchema();
      expect(retrievedSchema).toBe(schema);
    });

    it("should detect JSON format", () => {
      const format = memory.getWorkingMemoryFormat();
      expect(format).toBe("json");
    });

    it("should validate and save JSON content", async () => {
      const conversationId = "conv-123";
      const userId = "user-123";
      const content = {
        preferences: ["detailed explanations", "code examples"],
        context: "Working on TypeScript project",
        settings: {
          verbosity: "high" as const,
          codeStyle: "functional",
        },
      };

      // Create conversation first
      await memory.createConversation({
        id: conversationId,
        userId,
        resourceId: "resource-123",
        title: "Test Conversation",
        metadata: {},
      });

      await memory.updateWorkingMemory({
        conversationId,
        userId,
        content,
      });

      const retrieved = await memory.getWorkingMemory({
        conversationId,
        userId,
      });

      expect(retrieved).toBeTruthy();
      if (retrieved) {
        const parsed = JSON.parse(retrieved);
        expect(parsed).toEqual(content);
      }
    });

    it("should reject invalid JSON content", async () => {
      const conversationId = "conv-123";
      const userId = "user-123";
      const invalidContent = {
        preferences: "not an array", // Should be array
        context: "Working on TypeScript project",
        settings: {
          verbosity: "high",
        },
      };

      // Create conversation first
      await memory.createConversation({
        id: conversationId,
        userId,
        resourceId: "resource-123",
        title: "Test Conversation",
        metadata: {},
      });

      await expect(
        memory.updateWorkingMemory({
          conversationId,
          userId,
          content: invalidContent,
        }),
      ).rejects.toThrow("Invalid working memory format");
    });
  });

  describe("Working Memory Scopes", () => {
    it("should store working memory at conversation scope", async () => {
      storage = new InMemoryStorageAdapter();
      memory = new Memory({
        storage,
        workingMemory: {
          enabled: true,
          scope: "conversation",
        },
      });

      // Create conversations first
      await memory.createConversation({
        id: "conv-123",
        userId: "user-123",
        resourceId: "resource-123",
        title: "Test Conversation 1",
        metadata: {},
      });

      await memory.createConversation({
        id: "conv-456",
        userId: "user-123",
        resourceId: "resource-123",
        title: "Test Conversation 2",
        metadata: {},
      });

      await memory.updateWorkingMemory({
        conversationId: "conv-123",
        userId: "user-123",
        content: "Conversation-specific memory",
      });

      // Should retrieve for same conversation
      const result1 = await memory.getWorkingMemory({
        conversationId: "conv-123",
        userId: "user-123",
      });
      expect(result1).toBe("Conversation-specific memory");

      // Should not retrieve for different conversation
      const result2 = await memory.getWorkingMemory({
        conversationId: "conv-456",
        userId: "user-123",
      });
      expect(result2).toBeNull();
    });

    it("should store working memory at user scope", async () => {
      storage = new InMemoryStorageAdapter();
      memory = new Memory({
        storage,
        workingMemory: {
          enabled: true,
          scope: "user",
        },
      });

      await memory.updateWorkingMemory({
        conversationId: "conv-123",
        userId: "user-123",
        content: "User-level memory",
      });

      // Should retrieve for different conversation same user
      const result = await memory.getWorkingMemory({
        conversationId: "conv-456",
        userId: "user-123",
      });
      expect(result).toBe("User-level memory");
    });
  });

  describe("Working Memory Configuration", () => {
    it("should report working memory as not supported when disabled", () => {
      memory = new Memory({
        storage: new InMemoryStorageAdapter(),
        workingMemory: {
          enabled: false,
        },
      });

      expect(memory.hasWorkingMemorySupport()).toBe(false);
    });

    it("should report working memory as supported when enabled", () => {
      memory = new Memory({
        storage: new InMemoryStorageAdapter(),
        workingMemory: {
          enabled: true,
        },
      });

      expect(memory.hasWorkingMemorySupport()).toBe(true);
    });

    it("should return null when trying to get working memory when disabled", async () => {
      memory = new Memory({
        storage: new InMemoryStorageAdapter(),
        workingMemory: {
          enabled: false,
        },
      });

      const result = await memory.getWorkingMemory({
        conversationId: "conv-123",
        userId: "user-123",
      });

      expect(result).toBeNull();
    });

    it("should throw error when trying to update working memory when disabled", async () => {
      memory = new Memory({
        storage: new InMemoryStorageAdapter(),
        workingMemory: {
          enabled: false,
        },
      });

      await expect(
        memory.updateWorkingMemory({
          conversationId: "conv-123",
          userId: "user-123",
          content: "test",
        }),
      ).rejects.toThrow("Working memory is not enabled");
    });
  });

  describe("Working Memory with Messages Integration", () => {
    beforeEach(() => {
      storage = new InMemoryStorageAdapter();
      memory = new Memory({
        storage,
        workingMemory: {
          enabled: true,
          scope: "conversation",
        },
      });
    });

    it("should maintain working memory alongside messages", async () => {
      const conversationId = "conv-123";
      const userId = "user-123";

      // Create a conversation
      await memory.createConversation({
        id: conversationId,
        resourceId: "resource-123",
        userId,
        title: "Test Conversation",
        metadata: {},
      });

      // Add messages
      const messages: UIMessage[] = [
        {
          id: "msg-1",
          role: "user",
          parts: [{ type: "text", text: "Hello" }],
        },
        {
          id: "msg-2",
          role: "assistant",
          parts: [{ type: "text", text: "Hi there!" }],
        },
      ];

      await memory.addMessages(messages, userId, conversationId);

      // Add working memory
      await memory.updateWorkingMemory({
        conversationId,
        userId,
        content: "User prefers casual conversation",
      });

      // Verify both messages and working memory exist
      const retrievedMessages = await memory.getMessages(userId, conversationId);
      expect(retrievedMessages).toHaveLength(2);

      const workingMemory = await memory.getWorkingMemory({
        conversationId,
        userId,
      });
      expect(workingMemory).toBe("User prefers casual conversation");
    });

    it("should preserve working memory when clearing messages", async () => {
      const conversationId = "conv-123";
      const userId = "user-123";

      // Create conversation first
      await memory.createConversation({
        id: conversationId,
        userId,
        resourceId: "resource-123",
        title: "Test Conversation",
        metadata: {},
      });

      // Add working memory
      await memory.updateWorkingMemory({
        conversationId,
        userId,
        content: "Important context",
      });

      // Add and then clear messages
      await memory.addMessage(
        {
          id: "msg-1",
          role: "user",
          parts: [{ type: "text", text: "Hello" }],
        },
        userId,
        conversationId,
      );

      await memory.clearMessages(userId, conversationId);

      // Working memory should still exist
      const workingMemory = await memory.getWorkingMemory({
        conversationId,
        userId,
      });
      expect(workingMemory).toBe("Important context");

      // Messages should be cleared
      const messages = await memory.getMessages(userId, conversationId);
      expect(messages).toHaveLength(0);
    });
  });
});

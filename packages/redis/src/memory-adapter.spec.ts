import { beforeEach, describe, expect, it, vi } from "vitest";
import { RedisMemoryAdapter } from "./memory-adapter";

// Mock ioredis
const mockPipeline = {
  set: vi.fn().mockReturnThis(),
  get: vi.fn().mockReturnThis(),
  del: vi.fn().mockReturnThis(),
  zadd: vi.fn().mockReturnThis(),
  zrem: vi.fn().mockReturnThis(),
  sadd: vi.fn().mockReturnThis(),
  srem: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue([]),
};

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  zadd: vi.fn(),
  zrange: vi.fn().mockResolvedValue([]),
  zrevrange: vi.fn().mockResolvedValue([]),
  zrangebyscore: vi.fn().mockResolvedValue([]),
  zrem: vi.fn(),
  sadd: vi.fn(),
  srem: vi.fn(),
  smembers: vi.fn().mockResolvedValue([]),
  pipeline: vi.fn(() => mockPipeline),
  quit: vi.fn().mockResolvedValue("OK"),
};

vi.mock("ioredis", () => ({
  default: vi.fn(() => mockRedis),
}));

describe("RedisMemoryAdapter", () => {
  let adapter: RedisMemoryAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new RedisMemoryAdapter({
      connection: "redis://localhost:6379",
      keyPrefix: "test",
    });
  });

  // ── Conversation tests ───────────────────────────────────────────────

  describe("createConversation", () => {
    it("creates a conversation and indexes it", async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await adapter.createConversation({
        id: "conv-1",
        resourceId: "agent-1",
        userId: "user-1",
        title: "Test Conversation",
        metadata: {},
      });

      expect(result.id).toBe("conv-1");
      expect(result.resourceId).toBe("agent-1");
      expect(result.userId).toBe("user-1");
      expect(result.title).toBe("Test Conversation");
      expect(result.createdAt).toBeDefined();

      expect(mockPipeline.set).toHaveBeenCalledWith("test:conv:conv-1", expect.any(String));
      expect(mockPipeline.zadd).toHaveBeenCalledWith(
        "test:convs:resource:agent-1",
        expect.any(Number),
        "conv-1",
      );
      expect(mockPipeline.zadd).toHaveBeenCalledWith(
        "test:convs:user:user-1",
        expect.any(Number),
        "conv-1",
      );
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it("throws ConversationAlreadyExistsError for duplicate IDs", async () => {
      mockRedis.exists.mockResolvedValue(1);

      await expect(
        adapter.createConversation({
          id: "conv-1",
          resourceId: "agent-1",
          userId: "user-1",
          title: "Test",
          metadata: {},
        }),
      ).rejects.toThrow();
    });
  });

  describe("getConversation", () => {
    it("returns a conversation by ID", async () => {
      const conv = {
        id: "conv-1",
        resourceId: "agent-1",
        userId: "user-1",
        title: "Test",
        metadata: {},
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(conv));

      const result = await adapter.getConversation("conv-1");
      expect(result).toEqual(conv);
      expect(mockRedis.get).toHaveBeenCalledWith("test:conv:conv-1");
    });

    it("returns null for nonexistent conversation", async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await adapter.getConversation("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("updateConversation", () => {
    it("updates title and updatedAt", async () => {
      const existing = {
        id: "conv-1",
        resourceId: "agent-1",
        userId: "user-1",
        title: "Old Title",
        metadata: {},
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(existing));

      const result = await adapter.updateConversation("conv-1", { title: "New Title" });
      expect(result.title).toBe("New Title");
      expect(result.createdAt).toBe(existing.createdAt);
      expect(result.updatedAt).not.toBe(existing.updatedAt);
    });

    it("throws ConversationNotFoundError for missing conversation", async () => {
      mockRedis.get.mockResolvedValue(null);
      await expect(adapter.updateConversation("nonexistent", { title: "X" })).rejects.toThrow();
    });
  });

  describe("deleteConversation", () => {
    it("deletes conversation and all related data", async () => {
      const conv = {
        id: "conv-1",
        resourceId: "agent-1",
        userId: "user-1",
        title: "Test",
        metadata: {},
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(conv));

      await adapter.deleteConversation("conv-1");

      expect(mockPipeline.del).toHaveBeenCalledWith("test:conv:conv-1");
      expect(mockPipeline.del).toHaveBeenCalledWith("test:msgs:conv-1");
      expect(mockPipeline.del).toHaveBeenCalledWith("test:steps:conv-1");
      expect(mockPipeline.zrem).toHaveBeenCalledWith("test:convs:resource:agent-1", "conv-1");
      expect(mockPipeline.zrem).toHaveBeenCalledWith("test:convs:user:user-1", "conv-1");
    });
  });

  // ── Message tests ────────────────────────────────────────────────────

  describe("addMessage", () => {
    it("adds a message to the conversation sorted set", async () => {
      await adapter.addMessage(
        { id: "msg-1", role: "user", parts: [{ type: "text", text: "hello" }] } as UIMessage,
        "user-1",
        "conv-1",
      );

      expect(mockRedis.zadd).toHaveBeenCalledWith(
        "test:msgs:conv-1",
        expect.any(Number),
        expect.stringContaining("msg-1"),
      );
    });
  });

  describe("getMessages", () => {
    it("returns messages from the sorted set", async () => {
      const msg = {
        id: "msg-1",
        role: "user",
        parts: [{ type: "text", text: "hi" }],
        createdAt: "2026-01-01T00:00:00.000Z",
      };
      mockRedis.zrange.mockResolvedValue([JSON.stringify(msg)]);

      const result = await adapter.getMessages("user-1", "conv-1");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("msg-1");
      expect(result[0].createdAt).toBeInstanceOf(Date);
    });

    it("applies limit option", async () => {
      const messages = Array.from({ length: 5 }, (_, i) =>
        JSON.stringify({
          id: `msg-${i}`,
          role: "user",
          parts: [],
          createdAt: new Date(2026, 0, 1, 0, i).toISOString(),
        }),
      );
      mockRedis.zrange.mockResolvedValue(messages);

      const result = await adapter.getMessages("user-1", "conv-1", { limit: 2 });
      expect(result).toHaveLength(2);
    });
  });

  describe("clearMessages", () => {
    it("clears messages for a specific conversation", async () => {
      await adapter.clearMessages("user-1", "conv-1");
      expect(mockRedis.del).toHaveBeenCalledWith("test:msgs:conv-1");
    });
  });

  // ── Working memory tests ─────────────────────────────────────────────

  describe("workingMemory", () => {
    it("sets and gets conversation-scoped working memory", async () => {
      mockRedis.get.mockResolvedValue("memory content");

      const result = await adapter.getWorkingMemory({
        conversationId: "conv-1",
        scope: "conversation",
      });

      expect(result).toBe("memory content");
      expect(mockRedis.get).toHaveBeenCalledWith("test:wm:conv:conv-1");
    });

    it("sets user-scoped working memory", async () => {
      await adapter.setWorkingMemory({
        userId: "user-1",
        content: "user memory",
        scope: "user",
      });

      expect(mockRedis.set).toHaveBeenCalledWith("test:wm:user:user-1", "user memory");
    });

    it("deletes working memory", async () => {
      await adapter.deleteWorkingMemory({
        conversationId: "conv-1",
        scope: "conversation",
      });

      expect(mockRedis.del).toHaveBeenCalledWith("test:wm:conv:conv-1");
    });
  });

  // ── Workflow state tests ─────────────────────────────────────────────

  describe("workflowState", () => {
    it("stores and retrieves workflow state", async () => {
      const state = {
        id: "exec-1",
        workflowId: "wf-1",
        workflowName: "Test Workflow",
        status: "running" as const,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      };

      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          ...state,
          createdAt: state.createdAt.toISOString(),
          updatedAt: state.updatedAt.toISOString(),
        }),
      );

      const result = await adapter.getWorkflowState("exec-1");
      expect(result?.id).toBe("exec-1");
      expect(result?.workflowId).toBe("wf-1");
      expect(result?.createdAt).toBeInstanceOf(Date);
    });

    it("returns null for nonexistent workflow state", async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await adapter.getWorkflowState("nonexistent");
      expect(result).toBeNull();
    });
  });

  // ── Disconnect ───────────────────────────────────────────────────────

  describe("disconnect", () => {
    it("calls quit on the Redis client", async () => {
      await adapter.disconnect();
      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });
});

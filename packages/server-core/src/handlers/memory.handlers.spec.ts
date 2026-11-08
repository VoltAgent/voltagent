import type { Conversation } from "@voltagent/core";
import { describe, expect, it, vi } from "vitest";

import {
  handleDeleteMemoryConversation,
  handleGetMemoryConversation,
  handleListMemoryConversationMessages,
  handleListMemoryConversations,
  handleUpdateMemoryConversation,
} from "./memory.handlers";

const ALICE = "user-alice";
const BOB = "user-bob";

function aliceConversation(): Conversation {
  return {
    id: "conv-1",
    userId: ALICE,
    resourceId: "res-1",
    title: "Alice's chat",
    metadata: {},
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  } as Conversation;
}

function createDeps() {
  const conversations = [aliceConversation()];
  const memory = {
    getConversation: vi.fn(async (id: string) => conversations.find((c) => c.id === id) ?? null),
    queryConversations: vi.fn(async () => conversations),
    countConversations: vi.fn(async () => conversations.length),
    getMessages: vi.fn(async () => []),
    updateConversation: vi.fn(async (_id: string, updates: Record<string, unknown>) => ({
      ...aliceConversation(),
      ...updates,
    })),
    deleteConversation: vi.fn(async () => undefined),
  };
  const agent = {
    getMemory: vi.fn(() => memory),
    getFullState: () => ({ id: "agent-1", name: "Agent" }),
  };
  return {
    deps: {
      agentRegistry: {
        getAgent: vi.fn((id: string) => (id === "agent-1" ? agent : undefined)),
        getAllAgents: vi.fn(() => [agent]),
      },
    } as any,
    memory,
    conversations,
  };
}

describe("server-core: memory.handlers conversation ownership (#1371)", () => {
  describe("handleGetMemoryConversation", () => {
    it("returns the conversation when the authenticated user owns it", async () => {
      const { deps, memory } = createDeps();
      const res = await handleGetMemoryConversation(deps, "conv-1", {
        authenticatedUserId: ALICE,
      });
      expect(res.success).toBe(true);
      expect(memory.getConversation).toHaveBeenCalledWith("conv-1");
    });

    it("masks another user's conversation as 404", async () => {
      const { deps } = createDeps();
      const res = await handleGetMemoryConversation(deps, "conv-1", {
        authenticatedUserId: BOB,
      });
      expect(res).toMatchObject({
        success: false,
        error: "Conversation not found",
        httpStatus: 404,
      });
    });

    it("keeps the historical behavior when no authenticated user is present", async () => {
      const { deps } = createDeps();
      const res = await handleGetMemoryConversation(deps, "conv-1", {});
      expect(res.success).toBe(true);
    });
  });

  describe("handleListMemoryConversationMessages", () => {
    it("masks another user's conversation's messages as 404", async () => {
      const { deps, memory } = createDeps();
      const res = await handleListMemoryConversationMessages(deps, "conv-1", {
        authenticatedUserId: BOB,
      });
      expect(res).toMatchObject({ success: false, httpStatus: 404 });
      expect(memory.getMessages).not.toHaveBeenCalled();
    });

    it("does not let a caller read from another user's userId scope", async () => {
      const { deps, memory } = createDeps();
      await handleListMemoryConversationMessages(deps, "conv-1", {
        authenticatedUserId: ALICE,
        userId: BOB,
      });
      expect(memory.getMessages).toHaveBeenCalledWith(ALICE, "conv-1", expect.anything());
    });
  });

  describe("handleUpdateMemoryConversation", () => {
    it("rejects a tampering update with 404 and keeps the stored title", async () => {
      const { deps, memory, conversations } = createDeps();
      const res = await handleUpdateMemoryConversation(deps, "conv-1", {
        authenticatedUserId: BOB,
        title: "TAMPERED BY BOB",
      });
      expect(res).toMatchObject({ success: false, httpStatus: 404 });
      expect(memory.updateConversation).not.toHaveBeenCalled();
      expect(conversations[0].title).toBe("Alice's chat");
    });
  });

  describe("handleDeleteMemoryConversation", () => {
    it("rejects a deletion of another user's conversation", async () => {
      const { deps, memory, conversations } = createDeps();
      const res = await handleDeleteMemoryConversation(deps, "conv-1", {
        authenticatedUserId: BOB,
      });
      expect(res).toMatchObject({ success: false, httpStatus: 404 });
      expect(memory.deleteConversation).not.toHaveBeenCalled();
      expect(conversations).toHaveLength(1);
    });

    it("deletes when the authenticated user owns the conversation", async () => {
      const { deps, memory } = createDeps();
      const res = await handleDeleteMemoryConversation(deps, "conv-1", {
        authenticatedUserId: ALICE,
      });
      expect(res).toMatchObject({ success: true, data: { deleted: true } });
      expect(memory.deleteConversation).toHaveBeenCalledWith("conv-1");
    });
  });

  describe("handleListMemoryConversations", () => {
    it("scopes the listing to the authenticated user, not a client-supplied userId", async () => {
      const { deps, memory } = createDeps();
      await handleListMemoryConversations(deps, {
        userId: ALICE,
        authenticatedUserId: BOB,
      });
      expect(memory.queryConversations).toHaveBeenCalledWith(
        expect.objectContaining({ userId: BOB }),
      );
      expect(memory.countConversations).toHaveBeenCalledWith(
        expect.objectContaining({ userId: BOB }),
      );
    });

    it("passes the client's userId through when no authenticated user is present", async () => {
      const { deps, memory } = createDeps();
      await handleListMemoryConversations(deps, { userId: ALICE });
      expect(memory.queryConversations).toHaveBeenCalledWith(
        expect.objectContaining({ userId: ALICE }),
      );
    });
  });
});

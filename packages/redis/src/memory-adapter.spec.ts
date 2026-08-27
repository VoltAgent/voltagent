/**
 * Unit tests for Redis Memory Storage Adapter
 * Tests all functionality using an in-memory ioredis mock
 */

import { ConversationAlreadyExistsError, ConversationNotFoundError } from "@voltagent/core";
import type { ConversationStepRecord, WorkflowStateEntry } from "@voltagent/core";
import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RedisMemoryAdapter } from "./memory-adapter";

// In-memory ioredis replacement
const { FakeRedis } = vi.hoisted(() => {
  class FakePipeline {
    private commands: Array<{ name: string; args: any[] }> = [];

    constructor(private redis: FakeRedis) {}

    private record(name: string, args: any[]) {
      this.commands.push({ name, args });
      return this;
    }

    get(...args: any[]) {
      return this.record("get", args);
    }
    set(...args: any[]) {
      return this.record("set", args);
    }
    del(...args: any[]) {
      return this.record("del", args);
    }
    zadd(...args: any[]) {
      return this.record("zadd", args);
    }
    zrem(...args: any[]) {
      return this.record("zrem", args);
    }
    hset(...args: any[]) {
      return this.record("hset", args);
    }
    hdel(...args: any[]) {
      return this.record("hdel", args);
    }
    sadd(...args: any[]) {
      return this.record("sadd", args);
    }
    srem(...args: any[]) {
      return this.record("srem", args);
    }

    async exec(): Promise<Array<[Error | null, unknown]>> {
      if (this.redis.failNextExec) {
        this.redis.failNextExec = false;
        // Fail before executing anything so no partial state is applied
        return this.commands.map(() => [new Error("simulated pipeline failure"), null]);
      }

      const results: Array<[Error | null, unknown]> = [];
      for (const command of this.commands) {
        try {
          const result = await (this.redis as any)[command.name](...command.args);
          results.push([null, result]);
        } catch (error) {
          results.push([error as Error, null]);
        }
      }
      return results;
    }
  }

  class FakeRedis {
    static instances: FakeRedis[] = [];

    strings = new Map<string, string>();
    hashes = new Map<string, Map<string, string>>();
    zsets = new Map<string, Map<string, number>>();
    sets = new Map<string, Set<string>>();

    failNextExec = false;
    quitCalled = false;
    status: "ready" | "end" = "ready";

    constructor(public connection?: unknown) {
      FakeRedis.instances.push(this);
    }

    on() {
      return this;
    }

    pipeline() {
      return new FakePipeline(this);
    }

    async get(key: string) {
      return this.strings.get(key) ?? null;
    }

    async set(key: string, value: string, ...flags: any[]) {
      if (flags.includes("NX") && this.strings.has(key)) {
        return null;
      }
      this.strings.set(key, value);
      return "OK";
    }

    async del(...keys: string[]) {
      let removed = 0;
      for (const key of keys) {
        if (this.strings.delete(key)) removed++;
        if (this.hashes.delete(key)) removed++;
        if (this.zsets.delete(key)) removed++;
        if (this.sets.delete(key)) removed++;
      }
      return removed;
    }

    private zset(key: string) {
      let zset = this.zsets.get(key);
      if (!zset) {
        zset = new Map();
        this.zsets.set(key, zset);
      }
      return zset;
    }

    async zadd(key: string, score: number, member: string) {
      this.zset(key).set(member, Number(score));
      return 1;
    }

    async zrem(key: string, ...members: string[]) {
      const zset = this.zsets.get(key);
      if (!zset) return 0;
      let removed = 0;
      for (const member of members) {
        if (zset.delete(member)) removed++;
      }
      return removed;
    }

    private sortedMembers(key: string, reverse: boolean) {
      const zset = this.zsets.get(key);
      if (!zset) return [];
      const entries = [...zset.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
      if (reverse) entries.reverse();
      return entries.map(([member]) => member);
    }

    private sliceRange(members: string[], start: number, stop: number) {
      const length = members.length;
      const from = start < 0 ? Math.max(length + start, 0) : start;
      const to = stop < 0 ? length + stop : stop;
      return members.slice(from, to + 1);
    }

    async zrange(key: string, start: number, stop: number) {
      return this.sliceRange(this.sortedMembers(key, false), start, stop);
    }

    async zrevrange(key: string, start: number, stop: number) {
      return this.sliceRange(this.sortedMembers(key, true), start, stop);
    }

    async hset(key: string, field: string, value: string) {
      let hash = this.hashes.get(key);
      if (!hash) {
        hash = new Map();
        this.hashes.set(key, hash);
      }
      hash.set(field, value);
      return 1;
    }

    async hgetall(key: string) {
      return Object.fromEntries(this.hashes.get(key) ?? new Map());
    }

    async hdel(key: string, ...fields: string[]) {
      const hash = this.hashes.get(key);
      if (!hash) return 0;
      let removed = 0;
      for (const field of fields) {
        if (hash.delete(field)) removed++;
      }
      return removed;
    }

    async sadd(key: string, ...members: string[]) {
      let set = this.sets.get(key);
      if (!set) {
        set = new Set();
        this.sets.set(key, set);
      }
      for (const member of members) set.add(member);
      return members.length;
    }

    async srem(key: string, ...members: string[]) {
      const set = this.sets.get(key);
      if (!set) return 0;
      let removed = 0;
      for (const member of members) {
        if (set.delete(member)) removed++;
      }
      return removed;
    }

    async smembers(key: string) {
      return [...(this.sets.get(key) ?? new Set<string>())];
    }

    async quit() {
      if (this.status === "end") {
        throw new Error("Connection is closed.");
      }
      this.status = "end";
      this.quitCalled = true;
      return "OK";
    }
  }

  return { FakeRedis };
});

vi.mock("ioredis", () => ({
  Redis: FakeRedis,
  default: FakeRedis,
}));

// ============================================================================
// Test Helpers
// ============================================================================

const createAdapter = () =>
  new RedisMemoryAdapter({ connection: "redis://localhost:6379", keyPrefix: "test" });

const lastInstance = () => FakeRedis.instances[FakeRedis.instances.length - 1];

const createConversationInput = (overrides = {}) => ({
  id: "conv-1",
  resourceId: "resource-1",
  userId: "user-1",
  title: "Test Conversation",
  metadata: {},
  ...overrides,
});

const createMessage = (id: string, role: "user" | "assistant" = "user"): UIMessage => ({
  id,
  role,
  parts: [{ type: "text", text: `message ${id}` }],
});

const createWorkflowState = (overrides: Partial<WorkflowStateEntry> = {}): WorkflowStateEntry => ({
  id: "exec-1",
  workflowId: "workflow-1",
  workflowName: "Test Workflow",
  status: "running",
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  updatedAt: new Date("2025-01-01T00:00:00.000Z"),
  ...overrides,
});

const createStep = (overrides: Partial<ConversationStepRecord> = {}): ConversationStepRecord => ({
  id: "step-1",
  conversationId: "conv-1",
  userId: "user-1",
  agentId: "agent-1",
  operationId: "op-1",
  stepIndex: 0,
  type: "text",
  role: "assistant",
  createdAt: "2025-01-01T00:00:00.000Z",
  ...overrides,
});

describe.sequential("RedisMemoryAdapter", () => {
  let adapter: RedisMemoryAdapter;

  beforeEach(() => {
    FakeRedis.instances = [];
    adapter = createAdapter();
  });

  // ==========================================================================
  // Conversations
  // ==========================================================================

  describe("conversations", () => {
    it("creates and retrieves a conversation", async () => {
      const created = await adapter.createConversation(createConversationInput());

      expect(created.id).toBe("conv-1");
      expect(created.createdAt).toBe(created.updatedAt);

      const fetched = await adapter.getConversation("conv-1");
      expect(fetched).toEqual(created);
    });

    it("throws ConversationAlreadyExistsError when creating a duplicate", async () => {
      await adapter.createConversation(createConversationInput());

      await expect(adapter.createConversation(createConversationInput())).rejects.toBeInstanceOf(
        ConversationAlreadyExistsError,
      );
    });

    it("returns null for a missing conversation", async () => {
      await expect(adapter.getConversation("missing")).resolves.toBeNull();
    });

    it("throws ConversationNotFoundError when updating a missing conversation", async () => {
      await expect(adapter.updateConversation("missing", { title: "x" })).rejects.toBeInstanceOf(
        ConversationNotFoundError,
      );
    });

    it("queries conversations by resource, user, ordering and pagination", async () => {
      await adapter.createConversation(
        createConversationInput({ id: "c1", title: "Alpha", userId: "user-1" }),
      );
      await adapter.createConversation(
        createConversationInput({ id: "c2", title: "Beta", userId: "user-1" }),
      );
      await adapter.createConversation(
        createConversationInput({
          id: "c3",
          title: "Gamma",
          userId: "user-2",
          resourceId: "resource-2",
        }),
      );

      expect((await adapter.getConversations("resource-1")).map((c) => c.id)).toEqual(["c2", "c1"]);

      expect((await adapter.getConversationsByUserId("user-1")).map((c) => c.id)).toEqual([
        "c2",
        "c1",
      ]);

      const byTitle = await adapter.queryConversations({
        userId: "user-1",
        orderBy: "title",
        orderDirection: "ASC",
      });
      expect(byTitle.map((c) => c.id)).toEqual(["c1", "c2"]);

      const paged = await adapter.queryConversations({ limit: 1, offset: 1 });
      expect(paged).toHaveLength(1);

      await expect(adapter.countConversations({ userId: "user-1" })).resolves.toBe(2);
      await expect(adapter.countConversations({})).resolves.toBe(3);
    });

    it("updates a conversation and reindexes when resourceId changes", async () => {
      await adapter.createConversation(createConversationInput());

      const updated = await adapter.updateConversation("conv-1", {
        title: "Renamed",
        resourceId: "resource-2",
      });
      expect(updated.title).toBe("Renamed");
      expect(updated.resourceId).toBe("resource-2");

      expect(await adapter.getConversations("resource-1")).toHaveLength(0);
      expect((await adapter.getConversations("resource-2")).map((c) => c.id)).toEqual(["conv-1"]);
    });

    it("deletes a conversation along with its messages and indexes", async () => {
      await adapter.createConversation(createConversationInput());
      await adapter.addMessage(createMessage("m1"), "user-1", "conv-1");

      await adapter.deleteConversation("conv-1");

      await expect(adapter.getConversation("conv-1")).resolves.toBeNull();
      await expect(adapter.getMessages("user-1", "conv-1")).resolves.toEqual([]);
      await expect(adapter.countConversations({})).resolves.toBe(0);
    });

    it("propagates pipeline failures instead of ignoring them", async () => {
      lastInstance().failNextExec = true;

      await expect(adapter.createConversation(createConversationInput())).rejects.toThrow(
        "simulated pipeline failure",
      );

      // The failed pipeline must not leave partial index state behind
      await expect(adapter.countConversations({})).resolves.toBe(0);
    });
  });

  // ==========================================================================
  // Messages
  // ==========================================================================

  describe("messages", () => {
    beforeEach(async () => {
      await adapter.createConversation(createConversationInput());
    });

    it("throws ConversationNotFoundError when adding to a missing conversation", async () => {
      await expect(
        adapter.addMessage(createMessage("m1"), "user-1", "missing"),
      ).rejects.toBeInstanceOf(ConversationNotFoundError);
    });

    it("adds and retrieves messages with createdAt metadata", async () => {
      await adapter.addMessage(createMessage("m1"), "user-1", "conv-1");
      await adapter.addMessage(createMessage("m2", "assistant"), "user-1", "conv-1");

      const messages = await adapter.getMessages("user-1", "conv-1");

      expect(messages.map((m) => m.id)).toEqual(["m1", "m2"]);
      expect(messages[0].metadata?.createdAt).toBeInstanceOf(Date);
    });

    it("batches addMessages into a single pipeline", async () => {
      const instance = lastInstance();
      const pipelineSpy = vi.spyOn(instance, "pipeline");

      await adapter.addMessages(
        [createMessage("m1"), createMessage("m2"), createMessage("m3")],
        "user-1",
        "conv-1",
      );

      expect(pipelineSpy).toHaveBeenCalledTimes(1);
      expect((await adapter.getMessages("user-1", "conv-1")).map((m) => m.id)).toEqual([
        "m1",
        "m2",
        "m3",
      ]);
    });

    it("filters messages by role and limit, returning the latest in chronological order", async () => {
      await adapter.addMessages(
        [
          createMessage("m1"),
          createMessage("m2", "assistant"),
          createMessage("m3"),
          createMessage("m4", "assistant"),
        ],
        "user-1",
        "conv-1",
      );

      const assistants = await adapter.getMessages("user-1", "conv-1", {
        roles: ["assistant"],
      });
      expect(assistants.map((m) => m.id)).toEqual(["m2", "m4"]);

      const latestTwo = await adapter.getMessages("user-1", "conv-1", { limit: 2 });
      expect(latestTwo.map((m) => m.id)).toEqual(["m3", "m4"]);
    });

    it("does not return messages belonging to another user", async () => {
      await adapter.addMessage(createMessage("m1"), "user-2", "conv-1");

      await expect(adapter.getMessages("user-1", "conv-1")).resolves.toEqual([]);
      await expect(adapter.getMessages("user-2", "conv-1")).resolves.toHaveLength(1);
    });

    it("deletes specific messages by id", async () => {
      await adapter.addMessages([createMessage("m1"), createMessage("m2")], "user-1", "conv-1");

      await adapter.deleteMessages(["m1"], "user-1", "conv-1");

      expect((await adapter.getMessages("user-1", "conv-1")).map((m) => m.id)).toEqual(["m2"]);
    });

    it("clears messages for a single conversation", async () => {
      await adapter.addMessage(createMessage("m1"), "user-1", "conv-1");

      await adapter.clearMessages("user-1", "conv-1");

      await expect(adapter.getMessages("user-1", "conv-1")).resolves.toEqual([]);
    });

    it("keeps other users' messages and steps when clearing a conversation", async () => {
      await adapter.addMessage(createMessage("m1"), "user-1", "conv-1");
      await adapter.addMessage(createMessage("m2"), "user-2", "conv-1");
      await adapter.saveConversationSteps([
        createStep({ id: "step-1", userId: "user-1" }),
        createStep({ id: "step-2", userId: "user-2" }),
      ]);

      await adapter.clearMessages("user-1", "conv-1");

      await expect(adapter.getMessages("user-1", "conv-1")).resolves.toEqual([]);
      const remaining = await adapter.getMessages("user-2", "conv-1");
      expect(remaining.map((m) => m.id)).toEqual(["m2"]);
      await expect(adapter.getConversationSteps("user-1", "conv-1")).resolves.toEqual([]);
      const remainingSteps = await adapter.getConversationSteps("user-2", "conv-1");
      expect(remainingSteps.map((s) => s.id)).toEqual(["step-2"]);
    });

    it("clears messages across all conversations of a user", async () => {
      await adapter.createConversation(createConversationInput({ id: "conv-2" }));
      await adapter.addMessage(createMessage("m1"), "user-1", "conv-1");
      await adapter.addMessage(createMessage("m2"), "user-1", "conv-2");

      await adapter.clearMessages("user-1");

      await expect(adapter.getMessages("user-1", "conv-1")).resolves.toEqual([]);
      await expect(adapter.getMessages("user-1", "conv-2")).resolves.toEqual([]);
    });
  });

  // ==========================================================================
  // Conversation Steps
  // ==========================================================================

  describe("conversation steps", () => {
    beforeEach(async () => {
      await adapter.createConversation(createConversationInput());
    });

    it("saves and retrieves steps ordered by step index", async () => {
      await adapter.saveConversationSteps([
        createStep({ id: "step-2", stepIndex: 1 }),
        createStep({ id: "step-1", stepIndex: 0 }),
      ]);

      const steps = await adapter.getConversationSteps("user-1", "conv-1");
      expect(steps.map((s) => s.id)).toEqual(["step-1", "step-2"]);
    });

    it("filters steps by operationId, userId and limit", async () => {
      await adapter.saveConversationSteps([
        createStep({ id: "step-1", operationId: "op-1", stepIndex: 0 }),
        createStep({ id: "step-2", operationId: "op-2", stepIndex: 1 }),
        createStep({ id: "step-3", operationId: "op-1", stepIndex: 2, userId: "user-2" }),
      ]);

      const filtered = await adapter.getConversationSteps("user-1", "conv-1", {
        operationId: "op-1",
      });
      expect(filtered.map((s) => s.id)).toEqual(["step-1"]);

      const limited = await adapter.getConversationSteps("user-1", "conv-1", { limit: 1 });
      expect(limited.map((s) => s.id)).toEqual(["step-1"]);
    });
  });

  // ==========================================================================
  // Working Memory
  // ==========================================================================

  describe("working memory", () => {
    it("sets, gets and deletes conversation-scoped working memory", async () => {
      await adapter.setWorkingMemory({
        conversationId: "conv-1",
        content: "remember this",
        scope: "conversation",
      });

      await expect(
        adapter.getWorkingMemory({ conversationId: "conv-1", scope: "conversation" }),
      ).resolves.toBe("remember this");

      await adapter.deleteWorkingMemory({ conversationId: "conv-1", scope: "conversation" });

      await expect(
        adapter.getWorkingMemory({ conversationId: "conv-1", scope: "conversation" }),
      ).resolves.toBeNull();
    });

    it("keeps user-scoped working memory separate from conversation scope", async () => {
      await adapter.setWorkingMemory({ userId: "user-1", content: "user data", scope: "user" });
      await adapter.setWorkingMemory({
        conversationId: "conv-1",
        content: "conversation data",
        scope: "conversation",
      });

      await expect(adapter.getWorkingMemory({ userId: "user-1", scope: "user" })).resolves.toBe(
        "user data",
      );
      await expect(
        adapter.getWorkingMemory({ conversationId: "conv-1", scope: "conversation" }),
      ).resolves.toBe("conversation data");
    });

    it("throws when the identifier required by the scope is missing", async () => {
      await expect(adapter.getWorkingMemory({ scope: "conversation" })).rejects.toThrow(
        "conversationId is required",
      );
      await expect(adapter.setWorkingMemory({ content: "x", scope: "user" })).rejects.toThrow(
        "userId is required",
      );
      await expect(adapter.deleteWorkingMemory({ scope: "user" })).rejects.toThrow(
        "userId is required",
      );
    });
  });

  // ==========================================================================
  // Workflow State
  // ==========================================================================

  describe("workflow state", () => {
    it("sets and gets workflow state with dates revived", async () => {
      const state = createWorkflowState({
        status: "suspended",
        suspension: { suspendedAt: new Date("2025-01-02T00:00:00.000Z"), stepIndex: 2 },
      });

      await adapter.setWorkflowState("exec-1", state);
      const fetched = await adapter.getWorkflowState("exec-1");

      expect(fetched?.workflowId).toBe("workflow-1");
      expect(fetched?.createdAt).toBeInstanceOf(Date);
      expect(fetched?.suspension?.suspendedAt).toBeInstanceOf(Date);
    });

    it("returns null for a missing workflow state", async () => {
      await expect(adapter.getWorkflowState("missing")).resolves.toBeNull();
    });

    it("updates workflow state, refreshing updatedAt and protecting indexed fields", async () => {
      await adapter.setWorkflowState("exec-1", createWorkflowState());

      await adapter.updateWorkflowState("exec-1", {
        status: "completed",
        workflowId: "other-workflow",
        createdAt: new Date("2020-01-01T00:00:00.000Z"),
      });

      const updated = await adapter.getWorkflowState("exec-1");
      expect(updated?.status).toBe("completed");
      // Index-driving fields must not change
      expect(updated?.workflowId).toBe("workflow-1");
      expect(updated?.createdAt).toEqual(new Date("2025-01-01T00:00:00.000Z"));
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(
        new Date("2025-01-01T00:00:00.000Z").getTime(),
      );
    });

    it("throws when updating a missing workflow state", async () => {
      await expect(adapter.updateWorkflowState("missing", { status: "completed" })).rejects.toThrow(
        "Workflow state missing not found",
      );
    });

    it("queries workflow runs with filters and pagination", async () => {
      await adapter.setWorkflowState(
        "exec-1",
        createWorkflowState({ createdAt: new Date("2025-01-01T00:00:00.000Z"), userId: "user-1" }),
      );
      await adapter.setWorkflowState(
        "exec-2",
        createWorkflowState({
          id: "exec-2",
          status: "completed",
          createdAt: new Date("2025-01-02T00:00:00.000Z"),
          userId: "user-1",
        }),
      );
      await adapter.setWorkflowState(
        "exec-3",
        createWorkflowState({
          id: "exec-3",
          workflowId: "workflow-2",
          createdAt: new Date("2025-01-03T00:00:00.000Z"),
        }),
      );

      // Newest first
      expect((await adapter.queryWorkflowRuns({})).map((s) => s.id)).toEqual([
        "exec-3",
        "exec-2",
        "exec-1",
      ]);

      expect(
        (await adapter.queryWorkflowRuns({ workflowId: "workflow-1" })).map((s) => s.id),
      ).toEqual(["exec-2", "exec-1"]);

      expect((await adapter.queryWorkflowRuns({ status: "completed" })).map((s) => s.id)).toEqual([
        "exec-2",
      ]);

      expect((await adapter.queryWorkflowRuns({ userId: "user-1" })).map((s) => s.id)).toEqual([
        "exec-2",
        "exec-1",
      ]);

      const paged = await adapter.queryWorkflowRuns({ limit: 1, offset: 1 });
      expect(paged.map((s) => s.id)).toEqual(["exec-2"]);
    });

    it("tracks suspended workflow states per workflow", async () => {
      await adapter.setWorkflowState("exec-1", createWorkflowState({ status: "suspended" }));
      await adapter.setWorkflowState(
        "exec-2",
        createWorkflowState({ id: "exec-2", status: "running" }),
      );

      expect((await adapter.getSuspendedWorkflowStates("workflow-1")).map((s) => s.id)).toEqual([
        "exec-1",
      ]);

      // Resuming removes the execution from the suspended index
      await adapter.updateWorkflowState("exec-1", { status: "running" });
      await expect(adapter.getSuspendedWorkflowStates("workflow-1")).resolves.toEqual([]);
    });
  });

  // ==========================================================================
  // Connection
  // ==========================================================================

  describe("connection", () => {
    it("disconnects the underlying client", async () => {
      await adapter.disconnect();
      expect(lastInstance().quitCalled).toBe(true);
    });

    it("is idempotent when called repeatedly", async () => {
      await adapter.disconnect();

      await expect(adapter.disconnect()).resolves.toBeUndefined();
      await expect(adapter.close()).resolves.toBeUndefined();
      expect(lastInstance().quitCalled).toBe(true);
    });

    it("tolerates concurrent disconnect calls", async () => {
      await expect(Promise.all([adapter.disconnect(), adapter.disconnect()])).resolves.toEqual([
        undefined,
        undefined,
      ]);
    });

    it("rethrows unexpected quit errors", async () => {
      vi.spyOn(lastInstance(), "quit").mockRejectedValueOnce(new Error("boom"));

      await expect(adapter.disconnect()).rejects.toThrow("boom");
    });
  });
});

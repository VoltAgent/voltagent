import { safeStringify } from "@voltagent/internal";
import { TaskRecordSchema } from "./schemas";
import type { TaskRecord } from "./types";
import { ValkeyTaskStore, createValkeyTaskStore } from "./valkey-store";

// Mock @valkey/valkey-glide so tests don't require the actual package
vi.mock("@valkey/valkey-glide", () => ({
  TimeUnit: { Seconds: "EX" },
}));

function makeClient() {
  return {
    get: vi.fn(),
    set: vi.fn(),
  };
}

function makeTaskRecord(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: "task-1",
    contextId: "ctx-1",
    status: { state: "submitted", timestamp: new Date().toISOString() },
    history: [],
    ...overrides,
  };
}

describe("ValkeyTaskStore", () => {
  it("load() returns deserialized TaskRecord when client.get returns a JSON string", async () => {
    const client = makeClient();
    const record = makeTaskRecord();
    client.get.mockResolvedValue(safeStringify(record));

    const store = new ValkeyTaskStore({ client } as any);
    const result = await store.load({ agentId: "agent-1", taskId: "task-1" });

    expect(result).toEqual(record);
  });

  it("load() returns null when client.get returns null", async () => {
    const client = makeClient();
    client.get.mockResolvedValue(null);

    const store = new ValkeyTaskStore({ client } as any);
    const result = await store.load({ agentId: "agent-1", taskId: "task-1" });

    expect(result).toBeNull();
  });

  it("load() handles GlideString Buffer values by converting to string", async () => {
    const client = makeClient();
    const record = makeTaskRecord();
    client.get.mockResolvedValue(Buffer.from(safeStringify(record)));

    const store = new ValkeyTaskStore({ client } as any);
    const result = await store.load({ agentId: "agent-1", taskId: "task-1" });

    expect(result).toEqual(record);
  });

  it("save() calls client.set with the correct composite key {keyPrefix}:{agentId}::{taskId}", async () => {
    const client = makeClient();
    client.set.mockResolvedValue("OK");
    const record = makeTaskRecord({ id: "task-42" });

    const store = new ValkeyTaskStore({ client, keyPrefix: "my-prefix" } as any);
    await store.save({ agentId: "agent-x", data: record });

    expect(client.set.mock.calls[0][0]).toBe("my-prefix:agent-x::task-42");
  });

  it("save() uses default keyPrefix 'a2a-tasks' when none is provided", async () => {
    const client = makeClient();
    client.set.mockResolvedValue("OK");
    const record = makeTaskRecord({ id: "task-42" });

    const store = new ValkeyTaskStore({ client } as any);
    await store.save({ agentId: "agent-x", data: record });

    expect(client.set.mock.calls[0][0]).toBe("a2a-tasks:agent-x::task-42");
  });

  it("save() serializes the TaskRecord as a JSON string containing the task data", async () => {
    const client = makeClient();
    client.set.mockResolvedValue("OK");
    const record = makeTaskRecord({ id: "task-99" });

    const store = new ValkeyTaskStore({ client } as any);
    await store.save({ agentId: "agent-1", data: record });

    const storedValue = client.set.mock.calls[0][1];
    expect(typeof storedValue).toBe("string");
    const parsed = JSON.parse(storedValue);
    expect(parsed.id).toBe("task-99");
    expect(parsed.contextId).toBe(record.contextId);
  });

  it("save() calls client.set with expiry options when ttlSeconds is configured", async () => {
    const client = makeClient();
    client.set.mockResolvedValue("OK");
    const record = makeTaskRecord({ id: "task-ttl" });

    const store = new ValkeyTaskStore({ client, ttlSeconds: 300 } as any);
    await store.save({ agentId: "agent-1", data: record });

    const options = client.set.mock.calls[0][2];
    expect(options).toEqual({ expiry: { type: "EX", count: 300 } });
  });

  it("save() calls client.set without expiry options when ttlSeconds is not configured", async () => {
    const client = makeClient();
    client.set.mockResolvedValue("OK");
    const record = makeTaskRecord({ id: "task-no-ttl" });

    const store = new ValkeyTaskStore({ client } as any);
    await store.save({ agentId: "agent-1", data: record });

    expect(client.set.mock.calls[0]).toHaveLength(2);
  });

  it("load() propagates errors thrown by client.get", async () => {
    const client = makeClient();
    client.get.mockRejectedValue(new Error("connection refused"));

    const store = new ValkeyTaskStore({ client } as any);
    await expect(store.load({ agentId: "agent-1", taskId: "task-1" })).rejects.toThrow(
      "connection refused",
    );
  });

  it("load() throws a descriptive error when stored data is corrupted JSON", async () => {
    const client = makeClient();
    client.get.mockResolvedValue("not-valid-json{{{");

    const store = new ValkeyTaskStore({ client, keyPrefix: "pfx" } as any);
    await expect(store.load({ agentId: "agent-1", taskId: "task-1" })).rejects.toThrow(
      /Failed to parse stored TaskRecord for key "pfx:agent-1::task-1"/,
    );
  });

  it("load() throws when stored data is valid JSON but fails schema validation", async () => {
    const client = makeClient();
    // Valid JSON but missing required TaskRecord fields (id, contextId, status, history)
    client.get.mockResolvedValue(safeStringify({ bogus: true }));

    const store = new ValkeyTaskStore({ client, keyPrefix: "pfx" } as any);
    await expect(store.load({ agentId: "agent-1", taskId: "task-1" })).rejects.toThrow(
      /Invalid TaskRecord for key "pfx:agent-1::task-1"/,
    );
  });

  it("save() propagates errors thrown by client.set", async () => {
    const client = makeClient();
    client.set.mockRejectedValue(new Error("write timeout"));
    const record = makeTaskRecord({ id: "task-err" });

    const store = new ValkeyTaskStore({ client } as any);
    await expect(store.save({ agentId: "agent-1", data: record })).rejects.toThrow("write timeout");
  });

  it("exposes activeCancellations Set for task cancellation signaling", () => {
    const client = makeClient();
    const store = new ValkeyTaskStore({ client } as any);

    expect(store.activeCancellations).toBeInstanceOf(Set);
  });
});

describe("createValkeyTaskStore", () => {
  it("returns a ValkeyTaskStore instance with eagerly-resolved TimeUnit", async () => {
    const client = makeClient();
    client.set.mockResolvedValue("OK");

    const store = await createValkeyTaskStore({ client, ttlSeconds: 60 } as any);

    expect(store).toBeInstanceOf(ValkeyTaskStore);

    const record = makeTaskRecord({ id: "task-factory" });
    await store.save({ agentId: "agent-1", data: record });

    const options = client.set.mock.calls[0][2];
    expect(options).toEqual({ expiry: { type: "EX", count: 60 } });
  });

  it("returns a ValkeyTaskStore without resolving TimeUnit when no ttlSeconds", async () => {
    const client = makeClient();
    const store = await createValkeyTaskStore({ client } as any);
    expect(store).toBeInstanceOf(ValkeyTaskStore);
  });
});

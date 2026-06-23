import { safeStringify } from "@voltagent/internal";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryResumableStreamActiveStore,
  createResumableStreamAdapter,
  createResumableStreamGenericStore,
  createResumableStreamMemoryStore,
  createResumableStreamVoltOpsStore,
  resolveResumableStreamAdapter,
} from "./resumable-streams";

// Marker keys used internally
const DISABLED = "__voltagentResumableDisabled";
const DISABLED_REASON = "__voltagentResumableDisabledReason";
const STORE_TYPE = "__voltagentResumableStoreType";

const isDisabled = (value: unknown): boolean =>
  !!(value && typeof value === "object" && (value as Record<string, unknown>)[DISABLED] === true);

const getStoreType = (value: unknown): string | null => {
  if (!value || typeof value !== "object") return null;
  const t = (value as Record<string, unknown>)[STORE_TYPE];
  return typeof t === "string" ? t : null;
};

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("resumable-stream/generic", () => ({
  createResumableStreamContext: vi.fn(() => ({
    createNewResumableStream: vi.fn(async (_id: string, makeStream: () => ReadableStream<string>) =>
      makeStream(),
    ),
    resumeExistingStream: vi.fn(async () => null),
  })),
}));

vi.mock("resumable-stream/redis", () => ({
  createResumableStreamContext: vi.fn(() => ({
    createNewResumableStream: vi.fn(async (_id: string, makeStream: () => ReadableStream<string>) =>
      makeStream(),
    ),
    resumeExistingStream: vi.fn(async () => null),
  })),
}));

vi.mock("redis", () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn(async () => {}),
    publish: vi.fn(async () => 0),
    subscribe: vi.fn(async () => {}),
    unsubscribe: vi.fn(async () => {}),
    set: vi.fn(async () => "OK"),
    get: vi.fn(async () => null),
    del: vi.fn(async () => 1),
    incr: vi.fn(async () => 1),
  })),
}));

vi.mock("@voltagent/core", () => ({
  getGlobalVoltOpsClient: vi.fn(() => null),
  VoltOpsClient: vi.fn().mockImplementation(() => ({
    sendRequest: vi.fn(
      async () => new Response(safeStringify({ streamId: "test-id" }), { status: 200 }),
    ),
  })),
}));

// ---------------------------------------------------------------------------
// createMemoryResumableStreamActiveStore
// ---------------------------------------------------------------------------

describe("createMemoryResumableStreamActiveStore", () => {
  it("returns null for an unknown context", async () => {
    const store = createMemoryResumableStreamActiveStore();
    const result = await store.getActiveStreamId({ conversationId: "c1", userId: "u1" });
    expect(result).toBeNull();
  });

  it("stores and retrieves an active stream id", async () => {
    const store = createMemoryResumableStreamActiveStore();
    await store.setActiveStreamId({ conversationId: "c1", userId: "u1" }, "stream-abc");
    const result = await store.getActiveStreamId({ conversationId: "c1", userId: "u1" });
    expect(result).toBe("stream-abc");
  });

  it("clears the active stream id when no streamId specified", async () => {
    const store = createMemoryResumableStreamActiveStore();
    await store.setActiveStreamId({ conversationId: "c1", userId: "u1" }, "stream-abc");
    await store.clearActiveStream({ conversationId: "c1", userId: "u1" });
    const result = await store.getActiveStreamId({ conversationId: "c1", userId: "u1" });
    expect(result).toBeNull();
  });

  it("does not clear when streamId does not match", async () => {
    const store = createMemoryResumableStreamActiveStore();
    await store.setActiveStreamId({ conversationId: "c1", userId: "u1" }, "stream-abc");
    await store.clearActiveStream({ conversationId: "c1", userId: "u1", streamId: "other-id" });
    const result = await store.getActiveStreamId({ conversationId: "c1", userId: "u1" });
    expect(result).toBe("stream-abc");
  });

  it("clears when streamId matches the stored one", async () => {
    const store = createMemoryResumableStreamActiveStore();
    await store.setActiveStreamId({ conversationId: "c1", userId: "u1" }, "stream-abc");
    await store.clearActiveStream({ conversationId: "c1", userId: "u1", streamId: "stream-abc" });
    const result = await store.getActiveStreamId({ conversationId: "c1", userId: "u1" });
    expect(result).toBeNull();
  });

  it("isolates contexts with different conversationId", async () => {
    const store = createMemoryResumableStreamActiveStore();
    await store.setActiveStreamId({ conversationId: "c1", userId: "u1" }, "stream-1");
    await store.setActiveStreamId({ conversationId: "c2", userId: "u1" }, "stream-2");
    expect(await store.getActiveStreamId({ conversationId: "c1", userId: "u1" })).toBe("stream-1");
    expect(await store.getActiveStreamId({ conversationId: "c2", userId: "u1" })).toBe("stream-2");
  });
});

// ---------------------------------------------------------------------------
// createResumableStreamMemoryStore
// ---------------------------------------------------------------------------

describe("createResumableStreamMemoryStore", () => {
  it("returns a store marked with type 'memory'", async () => {
    const store = await createResumableStreamMemoryStore();
    expect(getStoreType(store)).toBe("memory");
  });

  it("is not marked as disabled", async () => {
    const store = await createResumableStreamMemoryStore();
    expect(isDisabled(store)).toBe(false);
  });

  it("exposes all required methods", async () => {
    const store = await createResumableStreamMemoryStore();
    expect(typeof store.createNewResumableStream).toBe("function");
    expect(typeof store.resumeExistingStream).toBe("function");
    expect(typeof store.getActiveStreamId).toBe("function");
    expect(typeof store.setActiveStreamId).toBe("function");
    expect(typeof store.clearActiveStream).toBe("function");
  });

  it("sets and gets active stream ids", async () => {
    const store = await createResumableStreamMemoryStore();
    await store.setActiveStreamId({ conversationId: "conv1", userId: "user1" }, "sid-1");
    const sid = await store.getActiveStreamId({ conversationId: "conv1", userId: "user1" });
    expect(sid).toBe("sid-1");
  });

  it("accepts a custom keyPrefix without throwing", async () => {
    const store = await createResumableStreamMemoryStore({ keyPrefix: "my-app" });
    expect(getStoreType(store)).toBe("memory");
  });
});

// ---------------------------------------------------------------------------
// createResumableStreamGenericStore
// ---------------------------------------------------------------------------

describe("createResumableStreamGenericStore", () => {
  const makePublisher = () => ({
    connect: vi.fn(async () => {}),
    publish: vi.fn(async () => 0),
    set: vi.fn(async () => "OK" as const),
    get: vi.fn(async () => null as string | null),
    incr: vi.fn(async () => 1),
    del: vi.fn(async () => 1),
  });

  const makeSubscriber = () => ({
    connect: vi.fn(async () => {}),
    subscribe: vi.fn(async () => 1),
    unsubscribe: vi.fn(async () => {}),
  });

  it("returns a store marked with type 'custom'", async () => {
    const store = await createResumableStreamGenericStore({
      publisher: makePublisher(),
      subscriber: makeSubscriber(),
    });
    expect(getStoreType(store)).toBe("custom");
  });

  it("is not disabled", async () => {
    const store = await createResumableStreamGenericStore({
      publisher: makePublisher(),
      subscriber: makeSubscriber(),
    });
    expect(isDisabled(store)).toBe(false);
  });

  it("throws when publisher is missing", async () => {
    await expect(
      createResumableStreamGenericStore({
        publisher: undefined as never,
        subscriber: makeSubscriber(),
      }),
    ).rejects.toThrow("Generic resumable streams require both publisher and subscriber");
  });

  it("throws when subscriber is missing", async () => {
    await expect(
      createResumableStreamGenericStore({
        publisher: makePublisher(),
        subscriber: undefined as never,
      }),
    ).rejects.toThrow("Generic resumable streams require both publisher and subscriber");
  });
});

// ---------------------------------------------------------------------------
// createResumableStreamVoltOpsStore
// ---------------------------------------------------------------------------

describe("createResumableStreamVoltOpsStore", () => {
  beforeEach(() => {
    vi.stubEnv("VOLTAGENT_PUBLIC_KEY", "");
    vi.stubEnv("VOLTAGENT_SECRET_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a disabled store when no keys are provided", async () => {
    const store = await createResumableStreamVoltOpsStore();
    expect(isDisabled(store)).toBe(true);
    const reason = (store as Record<string, unknown>)[DISABLED_REASON] as string;
    expect(reason).toContain("VOLTAGENT_PUBLIC_KEY");
  });

  it("returns a non-disabled store when keys are supplied via options", async () => {
    const store = await createResumableStreamVoltOpsStore({
      publicKey: "pk_test",
      secretKey: "sk_test",
    });
    expect(isDisabled(store)).toBe(false);
    expect(getStoreType(store)).toBe("voltops");
  });

  it("uses env vars for keys", async () => {
    vi.stubEnv("VOLTAGENT_PUBLIC_KEY", "pk_env");
    vi.stubEnv("VOLTAGENT_SECRET_KEY", "sk_env");
    const store = await createResumableStreamVoltOpsStore();
    expect(isDisabled(store)).toBe(false);
    expect(getStoreType(store)).toBe("voltops");
  });
});

// ---------------------------------------------------------------------------
// createResumableStreamAdapter
// ---------------------------------------------------------------------------

describe("createResumableStreamAdapter", () => {
  beforeEach(() => {
    vi.stubEnv("VOLTAGENT_PUBLIC_KEY", "");
    vi.stubEnv("VOLTAGENT_SECRET_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws when no streamStore is provided", async () => {
    await expect(createResumableStreamAdapter({ streamStore: undefined as never })).rejects.toThrow(
      "Resumable stream store is required",
    );
  });

  it("returns a disabled adapter when the store is disabled", async () => {
    const disabledStore = await createResumableStreamVoltOpsStore(); // no keys → disabled
    const adapter = await createResumableStreamAdapter({ streamStore: disabledStore });
    expect(isDisabled(adapter)).toBe(true);
  });

  it("builds a valid adapter from a memory store", async () => {
    const store = await createResumableStreamMemoryStore();
    const adapter = await createResumableStreamAdapter({ streamStore: store });
    expect(isDisabled(adapter)).toBe(false);
    expect(typeof adapter.createStream).toBe("function");
    expect(typeof adapter.resumeStream).toBe("function");
    expect(typeof adapter.getActiveStreamId).toBe("function");
    expect(typeof adapter.clearActiveStream).toBe("function");
  });

  it("propagates store type marker to the adapter", async () => {
    const store = await createResumableStreamMemoryStore();
    const adapter = await createResumableStreamAdapter({ streamStore: store });
    expect(getStoreType(adapter)).toBe("memory");
  });

  it("throws when store has no active stream capability and none is provided", async () => {
    const minimalStore = {
      createNewResumableStream: vi.fn(async () => null),
      resumeExistingStream: vi.fn(async () => null),
    };
    await expect(createResumableStreamAdapter({ streamStore: minimalStore })).rejects.toThrow(
      "Resumable stream activeStreamStore is required",
    );
  });

  it("accepts an explicit activeStreamStore", async () => {
    const minimalStore = {
      createNewResumableStream: vi.fn(async () => null),
      resumeExistingStream: vi.fn(async () => null),
    };
    const activeStore = createMemoryResumableStreamActiveStore();
    const adapter = await createResumableStreamAdapter({
      streamStore: minimalStore,
      activeStreamStore: activeStore,
    });
    expect(isDisabled(adapter)).toBe(false);
    expect(typeof adapter.createStream).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// resolveResumableStreamAdapter
// ---------------------------------------------------------------------------

describe("resolveResumableStreamAdapter", () => {
  beforeEach(() => {
    vi.stubEnv("VOLTAGENT_PUBLIC_KEY", "");
    vi.stubEnv("VOLTAGENT_SECRET_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns undefined when no adapter is provided", () => {
    const result = resolveResumableStreamAdapter(undefined);
    expect(result).toBeUndefined();
  });

  it("returns the adapter when it is valid", async () => {
    const store = await createResumableStreamMemoryStore();
    const adapter = await createResumableStreamAdapter({ streamStore: store });
    const result = resolveResumableStreamAdapter(adapter);
    expect(result).toBe(adapter);
  });

  it("returns undefined and warns when the adapter is disabled", async () => {
    const disabledStore = await createResumableStreamVoltOpsStore(); // no keys
    const adapter = await createResumableStreamAdapter({ streamStore: disabledStore });
    const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
    const result = resolveResumableStreamAdapter(adapter, logger as never);
    expect(result).toBeUndefined();
    expect(logger.warn).toHaveBeenCalled();
  });

  it("returns undefined and errors on an invalid adapter shape", () => {
    const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
    const badAdapter = { notAnAdapter: true } as never;
    const result = resolveResumableStreamAdapter(badAdapter, logger as never);
    expect(result).toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });
});

import { createResumableStreamValkeyStore } from "./valkey-store";

vi.mock("@valkey/valkey-glide", () => ({
  GlideClient: { createClient: vi.fn() },
  GlideClientConfiguration: { PubSubChannelModes: { Exact: 0 } },
  TimeUnit: { Seconds: "EX" },
}));

vi.mock("resumable-stream/generic", () => ({
  createResumableStreamContext: vi.fn().mockReturnValue({
    createNewResumableStream: vi.fn(),
    resumeExistingStream: vi.fn(),
  }),
}));

function makeGlideClient() {
  return {
    get: vi.fn(),
    set: vi.fn(),
    incr: vi.fn(),
    publish: vi.fn(),
    del: vi.fn(),
  };
}

function makeOptions(clientOverrides = {}) {
  return {
    client: { ...makeGlideClient(), ...clientOverrides },
    clientConfig: { addresses: [{ host: "localhost", port: 6379 }] },
  };
}

async function getPublisher(clientOverrides = {}) {
  const { createResumableStreamContext } = await import("resumable-stream/generic");
  const mockCtx = vi.mocked(createResumableStreamContext);
  mockCtx.mockClear();

  const opts = makeOptions(clientOverrides);
  await createResumableStreamValkeyStore(opts as any);

  const callArgs = mockCtx.mock.calls[0][0] as any;
  return { publisher: callArgs.publisher, subscriber: callArgs.subscriber, client: opts.client };
}

describe("ValkeyResumableStreamStore — Publisher adapter", () => {
  it("set with { EX: 60 } calls client.set with expiry", async () => {
    const { publisher, client } = await getPublisher();
    (client as any).set.mockResolvedValue("OK");

    await publisher.set("my-key", "my-value", { EX: 60 });

    expect((client as any).set).toHaveBeenCalledWith("my-key", "my-value", {
      expiry: { type: "EX", count: 60 },
    });
  });

  it("set without EX calls client.set with just key and value", async () => {
    const { publisher, client } = await getPublisher();
    (client as any).set.mockResolvedValue("OK");

    await publisher.set("my-key", "my-value");

    expect((client as any).set).toHaveBeenCalledWith("my-key", "my-value");
    expect((client as any).set).toHaveBeenCalledTimes(1);
    expect((client as any).set.mock.calls[0]).toHaveLength(2);
  });

  it("get converts GlideString (Buffer) to string", async () => {
    const { publisher, client } = await getPublisher();
    (client as any).get.mockResolvedValue(Buffer.from("hello"));

    const result = await publisher.get("some-key");

    expect(result).toBe("hello");
  });

  it("get returns null when client returns null", async () => {
    const { publisher, client } = await getPublisher();
    (client as any).get.mockResolvedValue(null);

    const result = await publisher.get("missing-key");

    expect(result).toBeNull();
  });

  it("incr delegates to client.incr", async () => {
    const { publisher, client } = await getPublisher();
    (client as any).incr.mockResolvedValue(5);

    const result = await publisher.incr("counter-key");

    expect((client as any).incr).toHaveBeenCalledWith("counter-key");
    expect(result).toBe(5);
  });

  it("publish delegates to client.publish", async () => {
    const { publisher, client } = await getPublisher();
    (client as any).publish.mockResolvedValue(1);

    const result = await publisher.publish("my-channel", "my-message");

    expect((client as any).publish).toHaveBeenCalledWith("my-channel", "my-message");
    expect(result).toBe(1);
  });

  it("del calls client.del([key])", async () => {
    const { publisher, client } = await getPublisher();
    (client as any).del.mockResolvedValue(1);

    await publisher.del("some-key");

    expect((client as any).del).toHaveBeenCalledWith(["some-key"]);
  });
});

describe("ValkeyResumableStreamStore — Subscriber adapter", () => {
  it("subscribe calls GlideClient.createClient with correct pubsubSubscriptions config", async () => {
    const { GlideClient } = await import("@valkey/valkey-glide");
    const mockCreateClient = vi.mocked(GlideClient.createClient);
    const mockSubClient = { close: vi.fn() };
    mockCreateClient.mockResolvedValue(mockSubClient as any);

    const { subscriber } = await getPublisher();
    const callback = vi.fn();

    await subscriber.subscribe("test-channel", callback);

    expect(mockCreateClient).toHaveBeenCalledWith(
      expect.objectContaining({
        addresses: [{ host: "localhost", port: 6379 }],
        pubsubSubscriptions: expect.objectContaining({
          channelsAndPatterns: expect.objectContaining({
            0: expect.any(Set),
          }),
          callback: expect.any(Function),
        }),
      }),
    );

    const callArg = mockCreateClient.mock.calls[0][0] as any;
    expect(callArg.pubsubSubscriptions.channelsAndPatterns[0].has("test-channel")).toBe(true);
  });

  it("subscribe callback invokes the provided callback with msg.message", async () => {
    const { GlideClient } = await import("@valkey/valkey-glide");
    const mockCreateClient = vi.mocked(GlideClient.createClient);
    const mockSubClient = { close: vi.fn() };
    mockCreateClient.mockClear();
    mockCreateClient.mockResolvedValue(mockSubClient as any);

    const { subscriber } = await getPublisher();
    const callback = vi.fn();

    mockCreateClient.mockClear();
    await subscriber.subscribe("test-channel", callback);

    const callArg = mockCreateClient.mock.calls[0][0] as any;
    callArg.pubsubSubscriptions.callback({ message: "hello-world" }, null);

    expect(callback).toHaveBeenCalledWith("hello-world");
  });

  it("unsubscribe calls close() on the subscription client and removes it", async () => {
    const { GlideClient } = await import("@valkey/valkey-glide");
    const mockCreateClient = vi.mocked(GlideClient.createClient);
    const mockSubClient = { close: vi.fn() };
    mockCreateClient.mockResolvedValue(mockSubClient as any);

    const { subscriber } = await getPublisher();
    await subscriber.subscribe("test-channel", vi.fn());
    await subscriber.unsubscribe("test-channel");

    expect(mockSubClient.close).toHaveBeenCalledTimes(1);

    // Unsubscribing again should not throw (client already removed)
    await expect(subscriber.unsubscribe("test-channel")).resolves.not.toThrow();
    expect(mockSubClient.close).toHaveBeenCalledTimes(1);
  });
});

describe("ValkeyResumableStreamStore — factory", () => {
  it("returns object with all required store methods", async () => {
    const opts = makeOptions();
    const store = await createResumableStreamValkeyStore(opts as any);

    expect(typeof store.createNewResumableStream).toBe("function");
    expect(typeof store.resumeExistingStream).toBe("function");
    expect(typeof store.getActiveStreamId).toBe("function");
    expect(typeof store.setActiveStreamId).toBe("function");
    expect(typeof store.clearActiveStream).toBe("function");
    expect(typeof store.close).toBe("function");
  });

  it("setActiveStreamId applies ttlSeconds as EX when configured", async () => {
    const client = makeGlideClient();
    client.set.mockResolvedValue("OK");
    client.get.mockResolvedValue(null);

    const opts = {
      ...makeOptions(),
      client,
      ttlSeconds: 600,
    };
    const store = await createResumableStreamValkeyStore(opts as any);

    await store.setActiveStreamId(
      { conversationId: "conv-1", userId: "user-1" } as any,
      "stream-42",
    );

    expect(client.set).toHaveBeenCalledWith("resumable-stream:active:user-1-conv-1", "stream-42", {
      expiry: { type: "EX", count: 600 },
    });
  });

  it("setActiveStreamId does NOT apply EX when ttlSeconds is not configured", async () => {
    const client = makeGlideClient();
    client.set.mockResolvedValue("OK");
    client.get.mockResolvedValue(null);

    const opts = {
      ...makeOptions(),
      client,
    };
    const store = await createResumableStreamValkeyStore(opts as any);

    await store.setActiveStreamId(
      { conversationId: "conv-1", userId: "user-1" } as any,
      "stream-99",
    );

    const setCalls = client.set.mock.calls;
    const activeSetCall = setCalls.find(
      (c: any[]) => typeof c[0] === "string" && c[0].includes("active:"),
    );
    expect(activeSetCall).toBeDefined();
    expect(activeSetCall).toHaveLength(2);
  });

  it("getActiveStreamId returns stored stream ID", async () => {
    const client = makeGlideClient();
    client.get.mockResolvedValue("stream-123");
    client.set.mockResolvedValue("OK");

    const opts = { ...makeOptions(), client };
    const store = await createResumableStreamValkeyStore(opts as any);

    const result = await store.getActiveStreamId({
      conversationId: "conv-1",
      userId: "user-1",
    } as any);

    expect(result).toBe("stream-123");
    expect(client.get).toHaveBeenCalledWith("resumable-stream:active:user-1-conv-1");
  });

  it("getActiveStreamId returns null when no active stream exists", async () => {
    const client = makeGlideClient();
    client.get.mockResolvedValue(null);
    client.set.mockResolvedValue("OK");

    const opts = { ...makeOptions(), client };
    const store = await createResumableStreamValkeyStore(opts as any);

    const result = await store.getActiveStreamId({
      conversationId: "conv-1",
      userId: "user-1",
    } as any);

    expect(result).toBeNull();
  });

  it("getActiveStreamId returns null when stored value is empty string", async () => {
    const client = makeGlideClient();
    client.get.mockResolvedValue("");
    client.set.mockResolvedValue("OK");

    const opts = { ...makeOptions(), client };
    const store = await createResumableStreamValkeyStore(opts as any);

    const result = await store.getActiveStreamId({
      conversationId: "conv-1",
      userId: "user-1",
    } as any);

    expect(result).toBeNull();
  });

  it("clearActiveStream deletes key when streamId matches current value", async () => {
    const client = makeGlideClient();
    client.get.mockResolvedValue("stream-42");
    client.del.mockResolvedValue(1);
    client.set.mockResolvedValue("OK");

    const opts = { ...makeOptions(), client };
    const store = await createResumableStreamValkeyStore(opts as any);

    await store.clearActiveStream({
      conversationId: "conv-1",
      userId: "user-1",
      streamId: "stream-42",
    } as any);

    expect(client.del).toHaveBeenCalledWith(["resumable-stream:active:user-1-conv-1"]);
  });

  it("clearActiveStream does NOT delete key when streamId does not match", async () => {
    const client = makeGlideClient();
    client.get.mockResolvedValue("stream-other");
    client.del.mockResolvedValue(1);
    client.set.mockResolvedValue("OK");

    const opts = { ...makeOptions(), client };
    const store = await createResumableStreamValkeyStore(opts as any);

    await store.clearActiveStream({
      conversationId: "conv-1",
      userId: "user-1",
      streamId: "stream-42",
    } as any);

    expect(client.del).not.toHaveBeenCalled();
  });

  it("store is tagged with valkey type marker", async () => {
    const opts = makeOptions();
    const store = (await createResumableStreamValkeyStore(opts as any)) as any;

    expect(store.__voltagentResumableStoreType).toBe("valkey");
  });

  it("close() closes all subscription clients and clears the map", async () => {
    const { GlideClient } = await import("@valkey/valkey-glide");
    const mockCreateClient = vi.mocked(GlideClient.createClient);
    const mockSubClient1 = { close: vi.fn() };
    const mockSubClient2 = { close: vi.fn() };
    mockCreateClient
      .mockResolvedValueOnce(mockSubClient1 as any)
      .mockResolvedValueOnce(mockSubClient2 as any);

    const opts = makeOptions();
    const store = await createResumableStreamValkeyStore(opts as any);

    const { createResumableStreamContext } = await import("resumable-stream/generic");
    const mockCtx = vi.mocked(createResumableStreamContext);
    const callArgs = mockCtx.mock.calls[mockCtx.mock.calls.length - 1][0] as any;
    await callArgs.subscriber.subscribe("channel-1", vi.fn());
    await callArgs.subscriber.subscribe("channel-2", vi.fn());

    await store.close();

    expect(mockSubClient1.close).toHaveBeenCalledTimes(1);
    expect(mockSubClient2.close).toHaveBeenCalledTimes(1);

    // Calling close() again should be safe (map is cleared)
    await store.close();
    expect(mockSubClient1.close).toHaveBeenCalledTimes(1);
    expect(mockSubClient2.close).toHaveBeenCalledTimes(1);
  });
});

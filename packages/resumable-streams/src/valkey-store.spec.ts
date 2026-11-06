import { createResumableStreamValkeyStore } from "./valkey-store";

vi.mock("@valkey/valkey-glide", () => ({
  GlideClient: { createClient: vi.fn() },
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

    expect((client as any).publish).toHaveBeenCalledWith("my-message", "my-channel");
    expect(result).toBe(1);
  });

  it("del calls client.del([key])", async () => {
    const { publisher, client } = await getPublisher();
    (client as any).del.mockResolvedValue(1);

    await publisher.del("some-key");

    expect((client as any).del).toHaveBeenCalledWith(["some-key"]);
  });
});

function makeSubClient() {
  return {
    subscribe: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
  };
}

async function mockCreateClient() {
  const { GlideClient } = await import("@valkey/valkey-glide");
  const createClient = vi.mocked(GlideClient.createClient);
  createClient.mockReset();
  return createClient;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("ValkeyResumableStreamStore — Subscriber adapter", () => {
  it("shares one subscriber client across channels", async () => {
    const createClient = await mockCreateClient();
    const subClient = makeSubClient();
    createClient.mockResolvedValue(subClient as any);

    const { subscriber } = await getPublisher();
    await subscriber.subscribe("channel-1", vi.fn());
    await subscriber.subscribe("channel-2", vi.fn());

    expect(createClient).toHaveBeenCalledTimes(1);
    const config = createClient.mock.calls[0][0] as any;
    expect(config.addresses).toEqual([{ host: "localhost", port: 6379 }]);
    expect(config.clientInfoTag).toBe("voltagent");
    expect(config.pubsubSubscriptions.channelsAndPatterns).toEqual({});
    expect(subClient.subscribe).toHaveBeenNthCalledWith(1, new Set(["channel-1"]), 5000);
    expect(subClient.subscribe).toHaveBeenNthCalledWith(2, new Set(["channel-2"]), 5000);
  });

  it("dispatches each message to its channel's callback only", async () => {
    const createClient = await mockCreateClient();
    createClient.mockResolvedValue(makeSubClient() as any);

    const { subscriber } = await getPublisher();
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    await subscriber.subscribe("channel-1", callback1);
    await subscriber.subscribe("channel-2", callback2);

    const { callback } = (createClient.mock.calls[0][0] as any).pubsubSubscriptions;
    callback({ channel: "channel-1", message: "hello" }, null);
    callback({ channel: "other", message: "ignored" }, null);

    expect(callback1).toHaveBeenCalledWith("hello");
    expect(callback2).not.toHaveBeenCalled();
  });

  it("unsubscribe stops delivery and keeps the shared client open", async () => {
    const createClient = await mockCreateClient();
    const subClient = makeSubClient();
    createClient.mockResolvedValue(subClient as any);

    const { subscriber } = await getPublisher();
    const callback = vi.fn();
    await subscriber.subscribe("test-channel", callback);
    await subscriber.unsubscribe("test-channel");

    const { callback: dispatch } = (createClient.mock.calls[0][0] as any).pubsubSubscriptions;
    dispatch({ channel: "test-channel", message: "late" }, null);

    expect(callback).not.toHaveBeenCalled();
    expect(subClient.unsubscribe).toHaveBeenCalledWith(new Set(["test-channel"]), 5000);
    expect(subClient.close).not.toHaveBeenCalled();

    await subscriber.unsubscribe("test-channel");
    expect(subClient.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe during a pending subscribe leaves the channel unsubscribed", async () => {
    const createClient = await mockCreateClient();
    const subClient = makeSubClient();
    const create = deferred<any>();
    createClient.mockReturnValueOnce(create.promise);

    const { subscriber } = await getPublisher();
    const callback = vi.fn();
    const pending = subscriber.subscribe("test-channel", callback);
    const cancel = subscriber.unsubscribe("test-channel");
    create.resolve(subClient);
    await Promise.all([pending, cancel]);

    const { callback: dispatch } = (createClient.mock.calls[0][0] as any).pubsubSubscriptions;
    dispatch({ channel: "test-channel", message: "late" }, null);

    expect(callback).not.toHaveBeenCalled();
    expect(subClient.subscribe.mock.invocationCallOrder[0]).toBeLessThan(
      subClient.unsubscribe.mock.invocationCallOrder[0],
    );
  });

  it("retries client creation after a failed subscribe", async () => {
    const createClient = await mockCreateClient();
    const subClient = makeSubClient();
    createClient
      .mockRejectedValueOnce(new Error("connect failed"))
      .mockResolvedValueOnce(subClient as any);

    const { subscriber } = await getPublisher();
    await expect(subscriber.subscribe("test-channel", vi.fn())).rejects.toThrow("connect failed");
    await subscriber.subscribe("test-channel", vi.fn());

    expect(createClient).toHaveBeenCalledTimes(2);
    expect(subClient.subscribe).toHaveBeenCalledTimes(1);
  });

  it("enforces maxSubscriptions on distinct channels", async () => {
    const createClient = await mockCreateClient();
    createClient.mockResolvedValue(makeSubClient() as any);

    const { createResumableStreamContext } = await import("resumable-stream/generic");
    const mockCtx = vi.mocked(createResumableStreamContext);
    await createResumableStreamValkeyStore({ ...makeOptions(), maxSubscriptions: 1 } as any);
    const { subscriber } = mockCtx.mock.calls[mockCtx.mock.calls.length - 1][0] as any;

    await subscriber.subscribe("channel-1", vi.fn());
    await subscriber.subscribe("channel-1", vi.fn());
    await expect(subscriber.subscribe("channel-2", vi.fn())).rejects.toThrow(
      "Maximum subscription limit (1) reached",
    );
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 0.5])(
    "rejects maxSubscriptions=%s",
    async (maxSubscriptions) => {
      await expect(
        createResumableStreamValkeyStore({ ...makeOptions(), maxSubscriptions } as any),
      ).rejects.toThrow("maxSubscriptions must be a non-negative integer");
    },
  );

  it("retains the callback when unsubscribe fails so a retry can still remove it", async () => {
    const createClient = await mockCreateClient();
    const subClient = makeSubClient();
    subClient.unsubscribe
      .mockRejectedValueOnce(new Error("unsubscribe failed"))
      .mockResolvedValueOnce(undefined);
    createClient.mockResolvedValue(subClient as any);

    const { subscriber } = await getPublisher();
    const callback = vi.fn();
    await subscriber.subscribe("test-channel", callback);

    await expect(subscriber.unsubscribe("test-channel")).rejects.toThrow("unsubscribe failed");

    const { callback: dispatch } = (createClient.mock.calls[0][0] as any).pubsubSubscriptions;
    dispatch({ channel: "test-channel", message: "still-subscribed" }, null);
    expect(callback).toHaveBeenCalledWith("still-subscribed");

    await subscriber.unsubscribe("test-channel");
    expect(subClient.unsubscribe).toHaveBeenCalledTimes(2);

    dispatch({ channel: "test-channel", message: "late" }, null);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe keeps a callback re-registered while UNSUBSCRIBE is pending", async () => {
    const createClient = await mockCreateClient();
    const subClient = makeSubClient();
    const unsub = deferred<undefined>();
    subClient.unsubscribe.mockReturnValueOnce(unsub.promise);
    createClient.mockResolvedValue(subClient as any);

    const { subscriber } = await getPublisher();
    await subscriber.subscribe("test-channel", vi.fn());
    const cancel = subscriber.unsubscribe("test-channel");
    await vi.waitFor(() => expect(subClient.unsubscribe).toHaveBeenCalled());

    const resubscribed = vi.fn();
    await subscriber.subscribe("test-channel", resubscribed);
    unsub.resolve(undefined);
    await cancel;

    const { callback: dispatch } = (createClient.mock.calls[0][0] as any).pubsubSubscriptions;
    dispatch({ channel: "test-channel", message: "after-resubscribe" }, null);
    expect(resubscribed).toHaveBeenCalledWith("after-resubscribe");
  });

  it("subscribe() after close() does not create or leak a new subscriber client", async () => {
    const createClient = await mockCreateClient();
    const subClient = makeSubClient();
    createClient.mockResolvedValue(subClient as any);

    const store = await createResumableStreamValkeyStore(makeOptions() as any);
    const { createResumableStreamContext } = await import("resumable-stream/generic");
    const mockCtx = vi.mocked(createResumableStreamContext);
    const { subscriber } = mockCtx.mock.calls[mockCtx.mock.calls.length - 1][0] as any;

    await subscriber.subscribe("channel-1", vi.fn());
    await store.close();
    expect(subClient.close).toHaveBeenCalledTimes(1);

    createClient.mockClear();
    await subscriber.subscribe("channel-2", vi.fn());

    expect(createClient).not.toHaveBeenCalled();
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

  it.each([0, -1, 0.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects ttlSeconds=%s at creation",
    async (ttlSeconds) => {
      await expect(
        createResumableStreamValkeyStore({ ...makeOptions(), ttlSeconds } as any),
      ).rejects.toThrow("ttlSeconds must be a positive integer");
    },
  );

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

  it("close() closes the shared subscriber client once", async () => {
    const createClient = await mockCreateClient();
    const subClient = makeSubClient();
    createClient.mockResolvedValue(subClient as any);

    const store = await createResumableStreamValkeyStore(makeOptions() as any);
    const { createResumableStreamContext } = await import("resumable-stream/generic");
    const mockCtx = vi.mocked(createResumableStreamContext);
    const callArgs = mockCtx.mock.calls[mockCtx.mock.calls.length - 1][0] as any;
    await callArgs.subscriber.subscribe("channel-1", vi.fn());
    await callArgs.subscriber.subscribe("channel-2", vi.fn());

    await store.close();
    expect(subClient.close).toHaveBeenCalledTimes(1);

    await store.close();
    expect(subClient.close).toHaveBeenCalledTimes(1);
  });

  it("close() during a pending subscribe closes the client once it is created", async () => {
    const createClient = await mockCreateClient();
    const subClient = makeSubClient();
    const create = deferred<any>();
    createClient.mockReturnValueOnce(create.promise);

    const store = await createResumableStreamValkeyStore(makeOptions() as any);
    const { createResumableStreamContext } = await import("resumable-stream/generic");
    const mockCtx = vi.mocked(createResumableStreamContext);
    const callArgs = mockCtx.mock.calls[mockCtx.mock.calls.length - 1][0] as any;

    const pending = callArgs.subscriber.subscribe("channel-1", vi.fn());
    const closing = store.close();
    create.resolve(subClient);
    await Promise.allSettled([pending, closing]);

    expect(subClient.close).toHaveBeenCalledTimes(1);

    await store.close();
    expect(subClient.close).toHaveBeenCalledTimes(1);
  });
});

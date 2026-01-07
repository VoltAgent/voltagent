import type {
  ResumableStreamAdapter,
  ResumableStreamContext,
  ServerProviderDeps,
} from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import type {
  ResumableStreamActiveStore,
  ResumableStreamAdapterConfig,
  ResumableStreamGenericStoreOptions,
  ResumableStreamPublisher,
  ResumableStreamRedisStoreOptions,
  ResumableStreamStore,
  ResumableStreamStoreOptions,
  ResumableStreamSubscriber,
} from "./types";

const DEFAULT_KEY_PREFIX = "resumable-stream";

const resolveRedisUrl = () => {
  const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL or KV_URL environment variable is not set");
  }
  return redisUrl;
};

const createRandomUUID = () => {
  const cryptoApi = typeof globalThis !== "undefined" ? (globalThis as any).crypto : undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  const random = () => Math.floor(Math.random() * 0xffff);
  return (
    `${random().toString(16).padStart(4, "0")}${random().toString(16).padStart(4, "0")}-` +
    `${random().toString(16).padStart(4, "0")}-` +
    `${((random() & 0x0fff) | 0x4000).toString(16).padStart(4, "0")}-` +
    `${((random() & 0x3fff) | 0x8000).toString(16).padStart(4, "0")}-` +
    `${random().toString(16).padStart(4, "0")}${random().toString(16).padStart(4, "0")}${random().toString(16).padStart(4, "0")}`
  );
};

const buildStreamKey = ({ conversationId, userId }: ResumableStreamContext) => {
  if (!userId) {
    throw new Error("userId is required for resumable streams");
  }

  return `${userId}-${conversationId}`;
};

const buildActiveStreamKey = (keyPrefix: string, context: ResumableStreamContext) =>
  `${keyPrefix}:active:${buildStreamKey(context)}`;

const createActiveStreamStoreFromPublisher = (
  publisher: ResumableStreamPublisher,
  keyPrefix: string,
): ResumableStreamActiveStore => ({
  async getActiveStreamId(context) {
    const value = await publisher.get(buildActiveStreamKey(keyPrefix, context));
    if (value == null) {
      return null;
    }
    const id = String(value);
    return id.length === 0 ? null : id;
  },
  async setActiveStreamId(context, streamId) {
    await publisher.set(buildActiveStreamKey(keyPrefix, context), streamId);
  },
  async clearActiveStream({ streamId, ...context }) {
    const key = buildActiveStreamKey(keyPrefix, context);
    if (streamId) {
      const current = await publisher.get(key);
      if (current == null || String(current) !== streamId) {
        return;
      }
    }

    const del = (publisher as { del?: (key: string) => Promise<unknown> }).del;
    if (typeof del === "function") {
      await del.call(publisher, key);
      return;
    }

    await publisher.set(key, "", { EX: 1 });
  },
});

const mergeStreamAndActiveStore = <T extends ResumableStreamStore>(
  streamStore: T,
  activeStreamStore: ResumableStreamActiveStore,
): T & ResumableStreamActiveStore => ({
  ...streamStore,
  getActiveStreamId: activeStreamStore.getActiveStreamId,
  setActiveStreamId: activeStreamStore.setActiveStreamId,
  clearActiveStream: activeStreamStore.clearActiveStream,
});

export function createMemoryResumableStreamActiveStore(): ResumableStreamActiveStore {
  const activeStreams = new Map<string, string>();

  return {
    async getActiveStreamId(context) {
      return activeStreams.get(buildStreamKey(context)) ?? null;
    },
    async setActiveStreamId(context, streamId) {
      activeStreams.set(buildStreamKey(context), streamId);
    },
    async clearActiveStream({ streamId, ...context }) {
      const key = buildStreamKey(context);
      if (streamId && activeStreams.get(key) !== streamId) {
        return;
      }
      activeStreams.delete(key);
    },
  };
}

type InMemoryValue = {
  value: string;
  expiresAt?: number;
  timeoutId?: ReturnType<typeof setTimeout>;
};

const createInMemoryPubSub = () => {
  const channels = new Map<string, Set<(message: string) => void>>();
  const values = new Map<string, InMemoryValue>();

  const getValue = (key: string) => {
    const entry = values.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt !== undefined && Date.now() >= entry.expiresAt) {
      if (entry.timeoutId) {
        clearTimeout(entry.timeoutId);
      }
      values.delete(key);
      return null;
    }

    return entry;
  };

  const publisher: ResumableStreamPublisher = {
    async connect() {},
    async publish(channel, message) {
      const listeners = channels.get(channel);
      if (!listeners || listeners.size === 0) {
        return 0;
      }

      for (const listener of listeners) {
        listener(message);
      }

      return listeners.size;
    },
    async set(key, value, options) {
      const existing = values.get(key);
      if (existing?.timeoutId) {
        clearTimeout(existing.timeoutId);
      }

      let expiresAt: number | undefined;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      if (options?.EX !== undefined) {
        const ttlMs = options.EX * 1000;
        expiresAt = Date.now() + ttlMs;
        timeoutId = setTimeout(() => {
          values.delete(key);
        }, ttlMs);
      }

      values.set(key, { value, expiresAt, timeoutId });
      return "OK";
    },
    async get(key) {
      const entry = getValue(key);
      return entry ? entry.value : null;
    },
    async incr(key) {
      const entry = getValue(key);
      if (!entry) {
        values.set(key, { value: "1" });
        return 1;
      }

      const current = Number(entry.value);
      if (!Number.isInteger(current)) {
        throw new Error("ERR value is not an integer or out of range");
      }

      const next = current + 1;
      entry.value = String(next);
      values.set(key, entry);
      return next;
    },
  };

  const subscriber: ResumableStreamSubscriber = {
    async connect() {},
    async subscribe(channel, callback) {
      let listeners = channels.get(channel);
      if (!listeners) {
        listeners = new Set();
        channels.set(channel, listeners);
      }

      listeners.add(callback);
      return listeners.size;
    },
    async unsubscribe(channel) {
      channels.delete(channel);
    },
  };

  return { publisher, subscriber };
};

export async function createResumableStreamMemoryStore(
  options: ResumableStreamStoreOptions = {},
): Promise<ResumableStreamStore> {
  const { publisher, subscriber } = createInMemoryPubSub();
  const { createResumableStreamContext } = await import("resumable-stream/generic");

  const streamStore = createResumableStreamContext({
    keyPrefix: options.keyPrefix,
    waitUntil: options.waitUntil ?? null,
    publisher,
    subscriber,
  }) as ResumableStreamStore;

  const keyPrefix = options.keyPrefix ?? DEFAULT_KEY_PREFIX;
  const activeStreamStore = createActiveStreamStoreFromPublisher(publisher, keyPrefix);
  return mergeStreamAndActiveStore(streamStore, activeStreamStore);
}

export async function createResumableStreamRedisStore(
  options: ResumableStreamRedisStoreOptions = {},
): Promise<ResumableStreamStore> {
  const { createResumableStreamContext } = await import("resumable-stream/redis");
  const keyPrefix = options.keyPrefix ?? DEFAULT_KEY_PREFIX;

  let publisher = options.publisher;
  let subscriber = options.subscriber;
  const shouldCreatePublisher = !publisher;
  const shouldCreateSubscriber = !subscriber;

  if (shouldCreatePublisher || shouldCreateSubscriber) {
    const { createClient } = await import("redis");
    const redisUrl = resolveRedisUrl();

    if (shouldCreatePublisher) {
      publisher = createClient({ url: redisUrl });
    }
    if (shouldCreateSubscriber) {
      subscriber = createClient({ url: redisUrl });
    }

    await Promise.all([
      shouldCreatePublisher ? publisher?.connect() : Promise.resolve(),
      shouldCreateSubscriber ? subscriber?.connect() : Promise.resolve(),
    ]);
  }

  if (!publisher || !subscriber) {
    throw new Error("Redis resumable streams require both publisher and subscriber");
  }

  const streamStore = createResumableStreamContext({
    keyPrefix,
    waitUntil: options.waitUntil ?? null,
    publisher,
    subscriber,
  }) as ResumableStreamStore;

  const activeStreamStore = createActiveStreamStoreFromPublisher(publisher, keyPrefix);
  return mergeStreamAndActiveStore(streamStore, activeStreamStore);
}

export async function createResumableStreamGenericStore(
  options: ResumableStreamGenericStoreOptions,
): Promise<ResumableStreamStore> {
  if (!options.publisher || !options.subscriber) {
    throw new Error("Generic resumable streams require both publisher and subscriber");
  }

  const { createResumableStreamContext } = await import("resumable-stream/generic");
  const keyPrefix = options.keyPrefix ?? DEFAULT_KEY_PREFIX;

  const streamStore = createResumableStreamContext({
    keyPrefix,
    waitUntil: options.waitUntil ?? null,
    publisher: options.publisher,
    subscriber: options.subscriber,
  }) as ResumableStreamStore;

  const activeStreamStore = createActiveStreamStoreFromPublisher(options.publisher, keyPrefix);
  return mergeStreamAndActiveStore(streamStore, activeStreamStore);
}

export async function createResumableStreamAdapter(
  config: ResumableStreamAdapterConfig,
): Promise<ResumableStreamAdapter> {
  if (!config?.streamStore) {
    throw new Error("Resumable stream store is required");
  }

  const streamStore = config.streamStore;
  const activeStreamStore =
    config.activeStreamStore ?? (isResumableStreamActiveStore(streamStore) ? streamStore : null);
  if (!activeStreamStore) {
    throw new Error("Resumable stream activeStreamStore is required");
  }

  return {
    async createStream({ conversationId, agentId, userId, stream }) {
      const streamId = createRandomUUID();
      await streamStore.createNewResumableStream(streamId, () => stream);
      await activeStreamStore.setActiveStreamId({ conversationId, agentId, userId }, streamId);
      return streamId;
    },
    async resumeStream(streamId) {
      const stream = await streamStore.resumeExistingStream(streamId);
      return stream ?? null;
    },
    async getActiveStreamId(context) {
      return await activeStreamStore.getActiveStreamId(context);
    },
    async clearActiveStream({ streamId, ...context }) {
      await activeStreamStore.clearActiveStream({ ...context, streamId });
    },
  };
}

export async function resolveResumableStreamDeps(
  deps: ServerProviderDeps,
  adapter: ResumableStreamAdapter | undefined,
  logger?: Logger,
): Promise<ServerProviderDeps> {
  if (deps.resumableStream) {
    if (adapter) {
      logger?.warn("Resumable stream adapter ignored because an adapter is already provided");
    }
    return deps;
  }

  const resolvedAdapter = resolveResumableStreamAdapter(adapter, logger);
  if (!resolvedAdapter) {
    return deps;
  }

  return {
    ...deps,
    resumableStream: resolvedAdapter,
  };
}

export function resolveResumableStreamAdapter(
  adapter: ResumableStreamAdapter | undefined,
  logger?: Logger,
): ResumableStreamAdapter | undefined {
  if (!adapter) {
    return undefined;
  }

  if (!isResumableStreamAdapter(adapter)) {
    logger?.error("Invalid resumable stream adapter provided");
    return undefined;
  }

  return adapter;
}

function isResumableStreamAdapter(value: unknown): value is ResumableStreamAdapter {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ResumableStreamAdapter).createStream === "function" &&
    typeof (value as ResumableStreamAdapter).resumeStream === "function" &&
    typeof (value as ResumableStreamAdapter).getActiveStreamId === "function" &&
    typeof (value as ResumableStreamAdapter).clearActiveStream === "function"
  );
}

function isResumableStreamActiveStore(value: unknown): value is ResumableStreamActiveStore {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ResumableStreamActiveStore).getActiveStreamId === "function" &&
    typeof (value as ResumableStreamActiveStore).setActiveStreamId === "function" &&
    typeof (value as ResumableStreamActiveStore).clearActiveStream === "function"
  );
}

import { VoltOpsClient, getGlobalVoltOpsClient } from "@voltagent/core";
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
  ResumableStreamVoltOpsStoreOptions,
} from "./types";

const DEFAULT_KEY_PREFIX = "resumable-stream";
const RESUMABLE_STREAM_DOCS_URL = "https://voltagent.dev/docs/agents/resumable-streaming/";
const RESUMABLE_STREAM_DISABLED = "__voltagentResumableDisabled" as const;
const RESUMABLE_STREAM_DISABLED_REASON = "__voltagentResumableDisabledReason" as const;
const RESUMABLE_STREAM_DISABLED_DOCS_URL = "__voltagentResumableDisabledDocsUrl" as const;
const RESUMABLE_STREAM_STORE_TYPE = "__voltagentResumableStoreType" as const;
const RESUMABLE_STREAM_STORE_DISPLAY_NAME = "__voltagentResumableStoreDisplayName" as const;
const VOLTOPS_MISSING_KEYS_REASON =
  "Resumable streams are disabled because VOLTAGENT_PUBLIC_KEY and VOLTAGENT_SECRET_KEY are not configured.";

const resolveRedisUrl = () => {
  const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL or KV_URL environment variable is not set");
  }
  return redisUrl;
};

const normalizeBaseUrl = (value: string) => value.replace(/\/$/, "");

type ResumableStreamDisabledMetadata = {
  [RESUMABLE_STREAM_DISABLED]: true;
  [RESUMABLE_STREAM_DISABLED_REASON]?: string;
  [RESUMABLE_STREAM_DISABLED_DOCS_URL]?: string;
};

type ResumableStreamStoreMetadata = {
  [RESUMABLE_STREAM_STORE_TYPE]?: string;
  [RESUMABLE_STREAM_STORE_DISPLAY_NAME]?: string;
};

const markResumableStreamDisabled = <T extends object>(
  value: T,
  reason: string,
  docsUrl: string = RESUMABLE_STREAM_DOCS_URL,
): T & ResumableStreamDisabledMetadata => {
  Object.assign(value as Record<string, unknown>, {
    [RESUMABLE_STREAM_DISABLED]: true,
    [RESUMABLE_STREAM_DISABLED_REASON]: reason,
    [RESUMABLE_STREAM_DISABLED_DOCS_URL]: docsUrl,
  });

  return value as T & ResumableStreamDisabledMetadata;
};

const getResumableStreamDisabledInfo = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (record[RESUMABLE_STREAM_DISABLED] !== true) {
    return null;
  }

  const reason =
    typeof record[RESUMABLE_STREAM_DISABLED_REASON] === "string"
      ? (record[RESUMABLE_STREAM_DISABLED_REASON] as string)
      : "Resumable streams are disabled.";
  const docsUrl =
    typeof record[RESUMABLE_STREAM_DISABLED_DOCS_URL] === "string"
      ? (record[RESUMABLE_STREAM_DISABLED_DOCS_URL] as string)
      : RESUMABLE_STREAM_DOCS_URL;

  return { reason, docsUrl };
};

/** @internal */
export const markResumableStreamStoreType = <T extends object>(
  value: T,
  type: string,
  displayName?: string,
): T & ResumableStreamStoreMetadata => {
  Object.assign(value as Record<string, unknown>, {
    [RESUMABLE_STREAM_STORE_TYPE]: type,
    ...(displayName ? { [RESUMABLE_STREAM_STORE_DISPLAY_NAME]: displayName } : {}),
  });

  return value as T & ResumableStreamStoreMetadata;
};

const getResumableStreamStoreInfo = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const type = record[RESUMABLE_STREAM_STORE_TYPE];
  if (typeof type !== "string") {
    return null;
  }

  const displayName =
    typeof record[RESUMABLE_STREAM_STORE_DISPLAY_NAME] === "string"
      ? (record[RESUMABLE_STREAM_STORE_DISPLAY_NAME] as string)
      : null;

  return { type, displayName };
};

const createDisabledResumableStreamStore = (reason: string) => {
  const store: ResumableStreamStore & ResumableStreamActiveStore = {
    async createNewResumableStream() {
      return null;
    },
    async resumeExistingStream() {
      return undefined;
    },
    async getActiveStreamId() {
      return null;
    },
    async setActiveStreamId() {},
    async clearActiveStream() {},
  };

  return markResumableStreamDisabled(store, reason);
};

const createDisabledResumableStreamAdapter = (reason: string) => {
  const adapter: ResumableStreamAdapter = {
    async createStream() {
      return "";
    },
    async resumeStream() {
      return null;
    },
    async getActiveStreamId() {
      return null;
    },
    async clearActiveStream() {},
  };

  return markResumableStreamDisabled(adapter, reason);
};

const resolveVoltOpsClient = (
  options: ResumableStreamVoltOpsStoreOptions,
): VoltOpsClient | null => {
  if (options.voltOpsClient) {
    return options.voltOpsClient;
  }

  const globalClient = getGlobalVoltOpsClient();
  if (globalClient) {
    return globalClient;
  }

  const publicKey = options.publicKey ?? process.env.VOLTAGENT_PUBLIC_KEY;
  const secretKey = options.secretKey ?? process.env.VOLTAGENT_SECRET_KEY;

  if (!publicKey || !secretKey) {
    return null;
  }

  const baseUrl = normalizeBaseUrl(
    options.baseUrl ?? process.env.VOLTAGENT_API_BASE_URL ?? "https://api.voltagent.dev",
  );

  return new VoltOpsClient({ baseUrl, publicKey, secretKey });
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

/** @internal */
export const buildActiveStreamKey = (keyPrefix: string, context: ResumableStreamContext) =>
  `${keyPrefix}:active:${buildStreamKey(context)}`;

const buildActiveStreamQuery = (context: ResumableStreamContext, streamId?: string): string => {
  buildStreamKey(context);
  const params = new URLSearchParams({
    conversationId: context.conversationId,
    userId: context.userId,
  });
  if (streamId) {
    params.set("streamId", streamId);
  }
  return params.toString();
};

/** @internal */
export const createActiveStreamStoreFromPublisher = (
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

/** @internal */
export const mergeStreamAndActiveStore = <T extends ResumableStreamStore>(
  streamStore: T,
  activeStreamStore: ResumableStreamActiveStore,
): T & ResumableStreamActiveStore => ({
  ...streamStore,
  getActiveStreamId: activeStreamStore.getActiveStreamId,
  setActiveStreamId: activeStreamStore.setActiveStreamId,
  clearActiveStream: activeStreamStore.clearActiveStream,
});

/**
 * Creates an in-memory active-stream store that tracks which stream ID is
 * currently active for each conversation/user pair.
 *
 * @returns A {@link ResumableStreamActiveStore} backed by a `Map`.
 */
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

/**
 * Creates an in-memory resumable stream store backed by the `resumable-stream` library.
 *
 * Useful for development and testing. Data does not survive process restarts.
 *
 * @param options - Optional key prefix and `waitUntil` callback.
 * @returns A {@link ResumableStreamStore} with active-stream tracking.
 */
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
  const mergedStore = mergeStreamAndActiveStore(streamStore, activeStreamStore);
  return markResumableStreamStoreType(mergedStore, "memory", "Memory");
}

/**
 * Creates a Redis-backed resumable stream store.
 *
 * If `publisher` / `subscriber` clients are not provided, they are created
 * automatically from the `REDIS_URL` or `KV_URL` environment variable.
 *
 * @param options - Redis connection and key prefix options.
 * @returns A {@link ResumableStreamStore} with active-stream tracking.
 */
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
  const mergedStore = mergeStreamAndActiveStore(streamStore, activeStreamStore);
  return markResumableStreamStoreType(mergedStore, "redis", "Redis");
}

/**
 * Creates a resumable stream store from user-supplied publisher and subscriber instances.
 *
 * @param options - Must include both `publisher` and `subscriber`.
 * @returns A {@link ResumableStreamStore} with active-stream tracking.
 * @throws If `publisher` or `subscriber` is missing.
 */
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
  const mergedStore = mergeStreamAndActiveStore(streamStore, activeStreamStore);
  return markResumableStreamStoreType(mergedStore, "custom", "Custom");
}

/**
 * Creates a resumable stream store backed by the VoltOps managed service.
 *
 * Returns a disabled store when the required API keys are not configured.
 *
 * @param options - VoltOps client or API key configuration.
 * @returns A {@link ResumableStreamStore} with active-stream tracking, or a disabled stub.
 */
export async function createResumableStreamVoltOpsStore(
  options: ResumableStreamVoltOpsStoreOptions = {},
): Promise<ResumableStreamStore> {
  const voltOpsClient = resolveVoltOpsClient(options);
  if (!voltOpsClient) {
    return createDisabledResumableStreamStore(VOLTOPS_MISSING_KEYS_REASON);
  }

  const streamStore: ResumableStreamStore = {
    async createNewResumableStream(streamId, makeStream) {
      const stream = makeStream();
      const encodedStream = stream.pipeThrough(new TextEncoderStream());
      const requestInit = {
        method: "POST",
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
        body: encodedStream,
        duplex: "half",
      } as RequestInit;

      const uploadPromise = voltOpsClient
        .sendRequest(`/resumable-streams/streams/${encodeURIComponent(streamId)}`, requestInit)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to persist resumable stream (${response.status})`);
          }
        });

      if (options.waitUntil) {
        options.waitUntil(uploadPromise);
      } else {
        void uploadPromise.catch(() => {});
      }

      return stream;
    },
    async resumeExistingStream(streamId) {
      const response = await voltOpsClient.sendRequest(
        `/resumable-streams/streams/${encodeURIComponent(streamId)}`,
      );

      if (response.status === 204) {
        return undefined;
      }

      if (response.status === 410) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to resume resumable stream (${response.status})`);
      }

      if (!response.body) {
        return null;
      }

      return response.body.pipeThrough(new TextDecoderStream());
    },
  };

  const activeStreamStore: ResumableStreamActiveStore = {
    async getActiveStreamId(context) {
      const response = await voltOpsClient.sendRequest(
        `/resumable-streams/active?${buildActiveStreamQuery(context)}`,
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch active resumable stream (${response.status})`);
      }

      const payload = (await response.json()) as { streamId?: string | null };
      return typeof payload.streamId === "string" && payload.streamId.length > 0
        ? payload.streamId
        : null;
    },
    async setActiveStreamId(context, streamId) {
      const response = await voltOpsClient.sendRequest(
        `/resumable-streams/active?${buildActiveStreamQuery(context, streamId)}`,
        { method: "POST" },
      );

      if (!response.ok) {
        throw new Error(`Failed to set active resumable stream (${response.status})`);
      }
    },
    async clearActiveStream({ streamId, ...context }) {
      const response = await voltOpsClient.sendRequest(
        `/resumable-streams/active?${buildActiveStreamQuery(context, streamId)}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error(`Failed to clear active resumable stream (${response.status})`);
      }
    },
  };

  const mergedStore = mergeStreamAndActiveStore(streamStore, activeStreamStore);
  return markResumableStreamStoreType(mergedStore, "voltops", "VoltOps");
}

/**
 * Builds a {@link ResumableStreamAdapter} from a stream store and active-stream store.
 *
 * If `activeStreamStore` is not provided explicitly, it is inferred from `streamStore`
 * when the store implements the {@link ResumableStreamActiveStore} interface.
 *
 * @param config - Must include `streamStore`; `activeStreamStore` is inferred when possible.
 * @returns A fully wired {@link ResumableStreamAdapter}.
 * @throws If `streamStore` is missing or `activeStreamStore` cannot be resolved.
 */
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

  const disabledInfo =
    getResumableStreamDisabledInfo(streamStore) ??
    getResumableStreamDisabledInfo(activeStreamStore);
  if (disabledInfo) {
    return createDisabledResumableStreamAdapter(disabledInfo.reason);
  }

  const adapter: ResumableStreamAdapter = {
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

  const storeInfo =
    getResumableStreamStoreInfo(streamStore) ?? getResumableStreamStoreInfo(activeStreamStore);
  if (storeInfo) {
    return markResumableStreamStoreType(
      adapter,
      storeInfo.type,
      storeInfo.displayName ?? undefined,
    );
  }

  return adapter;
}

/**
 * Merges an existing resumable stream adapter into server-provider dependencies.
 *
 * If `deps` already contains a `resumableStream`, the provided adapter is ignored
 * (with a warning). Disabled adapters are also filtered out.
 *
 * @param deps - Current server-provider dependencies.
 * @param adapter - Optional adapter to inject.
 * @param logger - Optional logger for warnings.
 * @returns Updated dependencies with the resolved adapter, if any.
 */
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

/**
 * Validates a {@link ResumableStreamAdapter}, returning `undefined`
 * when the adapter is disabled or invalid.
 *
 * @param adapter - The adapter to validate.
 * @param logger - Optional logger for warnings.
 * @returns The validated adapter, or `undefined`.
 */
export function resolveResumableStreamAdapter(
  adapter: ResumableStreamAdapter | undefined,
  logger?: Logger,
): ResumableStreamAdapter | undefined {
  if (!adapter) {
    return undefined;
  }

  const disabledInfo = getResumableStreamDisabledInfo(adapter);
  if (disabledInfo) {
    logger?.warn(disabledInfo.reason, { docsUrl: disabledInfo.docsUrl });
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

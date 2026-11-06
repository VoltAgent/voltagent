import type { GlideClient, GlideClusterClient, TimeUnit } from "@valkey/valkey-glide";
import {
  buildActiveStreamKey,
  createActiveStreamStoreFromPublisher,
  markResumableStreamStoreType,
  mergeStreamAndActiveStore,
} from "./resumable-streams";
import type { ResumableStreamActiveStore, ResumableStreamStore } from "./types";

const DEFAULT_KEY_PREFIX = "resumable-stream";
const DEFAULT_CLIENT_INFO_TAG = "voltagent";
const SUBSCRIBE_TIMEOUT_MS = 5000;

/**
 * Connection configuration passed to the Valkey GLIDE client.
 *
 * At minimum, `addresses` must contain one `{ host, port }` entry. Additional
 * properties (TLS, timeouts, etc.) are forwarded to the underlying GLIDE
 * client constructor.
 */
export interface ValkeyConnectionConfig {
  addresses: Array<{ host: string; port: number }>;
  useTLS?: boolean;
  requestTimeout?: number;
  clientName?: string;
  /** Library-name tag sent via `CLIENT SETINFO LIB-NAME`. Defaults to `"voltagent"` on the subscriber client. */
  clientInfoTag?: string;
  [key: string]: unknown;
}

/**
 * Options for creating a Valkey-backed resumable stream store via
 * {@link createResumableStreamValkeyStore}.
 */
export interface ResumableStreamValkeyStoreOptions {
  /** Valkey client instance (standalone {@link GlideClient} or {@link GlideClusterClient}). */
  client: GlideClient | GlideClusterClient;
  /** Connection config reused when creating the shared pub/sub subscriber client. */
  clientConfig: ValkeyConnectionConfig;
  /** Key prefix for all Valkey keys managed by this store. Defaults to `"resumable-stream"`. */
  keyPrefix?: string;
  /** Optional TTL in seconds applied to active-stream keys. Must be a positive integer. */
  // Applied to active stream keys only; stream data keys are managed by resumable-stream/generic
  ttlSeconds?: number;
  /**
   * Maximum number of concurrent subscription channels. All channels share one subscriber
   * connection. Must be a non-negative integer. Defaults to 1000.
   */
  maxSubscriptions?: number;
  /** Optional callback (e.g. from a serverless runtime) to keep the process alive while background work completes. */
  waitUntil?: ((promise: Promise<unknown>) => void) | null;
}

/**
 * A resumable stream store backed by Valkey, combining stream creation/resumption
 * with active-stream tracking and a {@link close} method for cleanup.
 */
export type ValkeyResumableStreamStore = ResumableStreamStore &
  ResumableStreamActiveStore & {
    close(): Promise<void>;
  };

/**
 * Creates a Valkey-backed resumable stream store.
 *
 * The returned store uses the provided {@link GlideClient} (or
 * {@link GlideClusterClient}) for key-value and pub/sub operations required by
 * the `resumable-stream/generic` library. Pub/sub subscriptions share one
 * dedicated subscriber client, created on first use.
 *
 * @param options - Store configuration including the Valkey client, connection
 *   config, optional key prefix, TTL, and subscription limits.
 * @returns A {@link ValkeyResumableStreamStore} ready for use.
 * @throws If `@valkey/valkey-glide` is not installed.
 * @throws If `ttlSeconds` is provided but is not a positive integer.
 * @throws If `maxSubscriptions` is provided but is not a non-negative integer.
 */
export async function createResumableStreamValkeyStore(
  options: ResumableStreamValkeyStoreOptions,
): Promise<ValkeyResumableStreamStore> {
  let GlideClientClass: typeof GlideClient;
  let timeUnit: typeof TimeUnit;

  try {
    const mod = await import("@valkey/valkey-glide");
    GlideClientClass = mod.GlideClient;
    timeUnit = mod.TimeUnit;
  } catch {
    throw new Error(
      "@valkey/valkey-glide is required for createResumableStreamValkeyStore. " +
        "Install it with: pnpm add @valkey/valkey-glide",
    );
  }

  const keyPrefix = options.keyPrefix ?? DEFAULT_KEY_PREFIX;
  const { client, clientConfig } = options;

  if (
    options.ttlSeconds !== undefined &&
    (!Number.isInteger(options.ttlSeconds) || options.ttlSeconds <= 0)
  ) {
    throw new Error("ttlSeconds must be a positive integer");
  }

  // Publisher adapter
  const publisher = {
    async connect() {},
    async publish(channel: string, message: string) {
      return client.publish(message, channel);
    },
    async set(key: string, value: string, setOptions?: { EX?: number }) {
      if (setOptions?.EX !== undefined) {
        return client.set(key, value, {
          expiry: { type: timeUnit.Seconds, count: setOptions.EX },
        });
      }
      return client.set(key, value);
    },
    async get(key: string): Promise<string | null> {
      const result = await client.get(key);
      return result !== null ? String(result) : null;
    },
    async incr(key: string) {
      return client.incr(key);
    },
    async del(key: string) {
      return client.del([key]);
    },
  };

  // Subscriber adapter — one shared pub/sub client; channels are added and removed at runtime.
  // Detect whether the caller provided a cluster client so the subscriber client matches.
  let GlideClusterClientClass: typeof GlideClusterClient | undefined;
  try {
    const mod = await import("@valkey/valkey-glide");
    GlideClusterClientClass = mod.GlideClusterClient;
  } catch {
    // Already handled above; GlideClusterClient is only needed for cluster mode.
  }
  const isClusterMode =
    GlideClusterClientClass !== undefined && client instanceof GlideClusterClientClass;

  const maxSubscriptions = options.maxSubscriptions ?? 1000;
  if (!Number.isInteger(maxSubscriptions) || maxSubscriptions < 0) {
    throw new Error("maxSubscriptions must be a non-negative integer");
  }
  const channelCallbacks = new Map<string, (message: string) => void>();
  let subscriberClient: Promise<GlideClient | GlideClusterClient> | null = null;
  let closed = false;

  const getSubscriberClient = () => {
    if (!subscriberClient) {
      const config = {
        ...clientConfig,
        clientInfoTag: clientConfig.clientInfoTag ?? DEFAULT_CLIENT_INFO_TAG,
        pubsubSubscriptions: {
          channelsAndPatterns: {},
          callback: (msg: { channel: unknown; message: unknown }) =>
            channelCallbacks.get(String(msg.channel))?.(String(msg.message)),
        },
      };
      const created =
        isClusterMode && GlideClusterClientClass
          ? GlideClusterClientClass.createClient(config)
          : GlideClientClass.createClient(config);
      subscriberClient = created;
      created.catch(() => {
        if (subscriberClient === created) subscriberClient = null;
      });
    }
    return subscriberClient;
  };

  const subscriber = {
    async connect() {},
    async subscribe(channel: string, callback: (message: string) => void) {
      if (closed) return;
      if (!channelCallbacks.has(channel) && channelCallbacks.size >= maxSubscriptions) {
        throw new Error(
          `Maximum subscription limit (${maxSubscriptions}) reached. Unsubscribe from existing channels before subscribing to new ones.`,
        );
      }

      channelCallbacks.set(channel, callback);
      try {
        const subClient = await getSubscriberClient();
        await subClient.subscribe(new Set([channel]), SUBSCRIBE_TIMEOUT_MS);
      } catch (err) {
        if (channelCallbacks.get(channel) === callback) channelCallbacks.delete(channel);
        throw err;
      }
    },
    async unsubscribe(channel: string) {
      const callback = channelCallbacks.get(channel);
      if (!callback || !subscriberClient) return;
      const subClient = await subscriberClient;
      await subClient.unsubscribe(new Set([channel]), SUBSCRIBE_TIMEOUT_MS);
      if (channelCallbacks.get(channel) === callback) channelCallbacks.delete(channel);
    },
  };

  const { createResumableStreamContext } = await import("resumable-stream/generic");

  const streamStore = createResumableStreamContext({
    keyPrefix,
    waitUntil: options.waitUntil ?? null,
    publisher,
    subscriber,
  }) as ResumableStreamStore;

  const activeStreamStore = createActiveStreamStoreFromPublisher(publisher, keyPrefix);

  // Wire ttlSeconds into setActiveStreamId so active stream keys expire
  const ttlSeconds = options.ttlSeconds;
  const ttlActiveStreamStore =
    ttlSeconds !== undefined
      ? {
          ...activeStreamStore,
          async setActiveStreamId(
            context: Parameters<typeof activeStreamStore.setActiveStreamId>[0],
            streamId: string,
          ) {
            const key = buildActiveStreamKey(keyPrefix, context);
            await publisher.set(key, streamId, { EX: ttlSeconds });
          },
        }
      : activeStreamStore;

  const mergedStore = mergeStreamAndActiveStore(streamStore, ttlActiveStreamStore);
  const taggedStore = markResumableStreamStoreType(mergedStore, "valkey", "Valkey");

  return {
    ...taggedStore,
    /**
     * Closes the internally-created subscriber client. The main `client` passed in
     * `options` is **not** closed — the caller retains ownership of its lifecycle.
     */
    async close() {
      closed = true;
      channelCallbacks.clear();
      const pending = subscriberClient;
      subscriberClient = null;
      if (!pending) return;
      try {
        (await pending).close();
      } catch {
        // Creation failed, so there is no client to close.
      }
    },
  };
}

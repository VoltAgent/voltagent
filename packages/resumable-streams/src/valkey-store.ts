import type { GlideClient, GlideClusterClient, TimeUnit } from "@valkey/valkey-glide";
import {
  buildActiveStreamKey,
  createActiveStreamStoreFromPublisher,
  markResumableStreamStoreType,
  mergeStreamAndActiveStore,
} from "./resumable-streams";
import type { ResumableStreamActiveStore, ResumableStreamStore } from "./types";

const DEFAULT_KEY_PREFIX = "resumable-stream";

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
  [key: string]: unknown;
}

/**
 * Options for creating a Valkey-backed resumable stream store via
 * {@link createResumableStreamValkeyStore}.
 */
export interface ResumableStreamValkeyStoreOptions {
  /** Valkey client instance (standalone {@link GlideClient} or {@link GlideClusterClient}). */
  client: GlideClient | GlideClusterClient;
  /** Connection config reused when creating per-channel subscription clients. */
  clientConfig: ValkeyConnectionConfig;
  /** Key prefix for all Valkey keys managed by this store. Defaults to `"resumable-stream"`. */
  keyPrefix?: string;
  /** Optional TTL in seconds applied to active-stream keys. Must be a positive finite number. */
  // Applied to active stream keys only; stream data keys are managed by resumable-stream/generic
  ttlSeconds?: number;
  /**
   * Maximum number of concurrent subscription channels. Each subscription creates a
   * dedicated GlideClient TCP connection (required by the Glide pub/sub model), so this
   * also caps the number of open connections. Defaults to 1000.
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
 * the `resumable-stream/generic` library. Each pub/sub subscription creates a
 * dedicated GLIDE client connection (required by the GLIDE pub/sub model).
 *
 * @param options - Store configuration including the Valkey client, connection
 *   config, optional key prefix, TTL, and subscription limits.
 * @returns A {@link ValkeyResumableStreamStore} ready for use.
 * @throws If `@valkey/valkey-glide` is not installed or is an incompatible version.
 * @throws If `ttlSeconds` is provided but is not a positive finite number.
 */
export async function createResumableStreamValkeyStore(
  options: ResumableStreamValkeyStoreOptions,
): Promise<ValkeyResumableStreamStore> {
  let GlideClientClass: typeof GlideClient;
  let GlideClientConfigurationClass: { PubSubChannelModes: { Exact: number } };
  let timeUnit: typeof TimeUnit;

  try {
    const mod = await import("@valkey/valkey-glide");
    GlideClientClass = mod.GlideClient;
    // PubSubChannelModes isn't exported as a value type; use a single guarded access.
    const PubSubExact = (mod as any).GlideClientConfiguration?.PubSubChannelModes?.Exact;
    if (PubSubExact === undefined) {
      throw new Error(
        "GlideClientConfiguration.PubSubChannelModes.Exact is not available. " +
          "The installed version of @valkey/valkey-glide may be incompatible.",
      );
    }
    GlideClientConfigurationClass = { PubSubChannelModes: { Exact: PubSubExact } };
    timeUnit = mod.TimeUnit;
  } catch (err) {
    if (err instanceof Error && err.message.includes("PubSubChannelModes")) {
      throw err;
    }
    throw new Error(
      "@valkey/valkey-glide is required for createResumableStreamValkeyStore. " +
        "Install it with: pnpm add @valkey/valkey-glide",
    );
  }

  const keyPrefix = options.keyPrefix ?? DEFAULT_KEY_PREFIX;
  const { client, clientConfig } = options;

  if (
    options.ttlSeconds !== undefined &&
    (!Number.isFinite(options.ttlSeconds) || options.ttlSeconds <= 0)
  ) {
    throw new Error("ttlSeconds must be a positive finite number");
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

  // Subscriber adapter — one dedicated client per channel (Glide pub/sub requirement).
  // Detect whether the caller provided a cluster client so subscription clients match.
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
  const subscriptionClients = new Map<string, GlideClient | GlideClusterClient>();
  // Guard against concurrent subscribe calls interleaving across awaits.
  const pendingSubscriptions = new Set<string>();

  const subscriber = {
    async connect() {},
    async subscribe(channel: string, callback: (message: string) => void) {
      // Close any existing client for this channel to avoid resource leaks on duplicate calls
      const existing = subscriptionClients.get(channel);
      if (existing) {
        existing.close();
        subscriptionClients.delete(channel);
      }

      if (pendingSubscriptions.has(channel)) {
        throw new Error(`A subscription for channel "${channel}" is already being established.`);
      }

      if (subscriptionClients.size + pendingSubscriptions.size >= maxSubscriptions) {
        throw new Error(
          `Maximum subscription limit (${maxSubscriptions}) reached. Unsubscribe from existing channels before subscribing to new ones.`,
        );
      }

      pendingSubscriptions.add(channel);
      try {
        const pubsubConfig = {
          ...clientConfig,
          pubsubSubscriptions: {
            channelsAndPatterns: {
              [GlideClientConfigurationClass.PubSubChannelModes.Exact]: new Set([channel]),
            },
            callback: (msg: { message: unknown }, _ctx: unknown) => callback(String(msg.message)),
          },
        };

        const subClient =
          isClusterMode && GlideClusterClientClass
            ? await GlideClusterClientClass.createClient(pubsubConfig)
            : await GlideClientClass.createClient(pubsubConfig);

        subscriptionClients.set(channel, subClient);
      } finally {
        pendingSubscriptions.delete(channel);
      }
    },
    async unsubscribe(channel: string) {
      const subClient = subscriptionClients.get(channel);
      if (subClient) {
        subClient.close();
        subscriptionClients.delete(channel);
      }
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
     * Closes all internally-created subscription clients. The main `client` passed in
     * `options` is **not** closed — the caller retains ownership of its lifecycle.
     */
    async close() {
      for (const subClient of subscriptionClients.values()) {
        subClient.close();
      }
      subscriptionClients.clear();
    },
  };
}

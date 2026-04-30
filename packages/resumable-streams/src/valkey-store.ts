import type { GlideClient, GlideClusterClient, TimeUnit } from "@valkey/valkey-glide";
import {
  buildActiveStreamKey,
  createActiveStreamStoreFromPublisher,
  markResumableStreamStoreType,
  mergeStreamAndActiveStore,
} from "./resumable-streams";
import type { ResumableStreamActiveStore, ResumableStreamStore } from "./types";

const DEFAULT_KEY_PREFIX = "resumable-stream";

export interface ValkeyConnectionConfig {
  addresses: Array<{ host: string; port: number }>;
  useTLS?: boolean;
  requestTimeout?: number;
  clientName?: string;
  [key: string]: unknown;
}

export interface ResumableStreamValkeyStoreOptions {
  client: GlideClient | GlideClusterClient;
  clientConfig: ValkeyConnectionConfig;
  keyPrefix?: string;
  // Applied to active stream keys only; stream data keys are managed by resumable-stream/generic
  ttlSeconds?: number;
  /**
   * Maximum number of concurrent subscription channels. Each subscription creates a
   * dedicated GlideClient TCP connection (required by the Glide pub/sub model), so this
   * also caps the number of open connections. Defaults to 1000.
   */
  maxSubscriptions?: number;
  waitUntil?: ((promise: Promise<unknown>) => void) | null;
}

export type ValkeyResumableStreamStore = ResumableStreamStore &
  ResumableStreamActiveStore & {
    close(): Promise<void>;
  };

export async function createResumableStreamValkeyStore(
  options: ResumableStreamValkeyStoreOptions,
): Promise<ValkeyResumableStreamStore> {
  let GlideClientClass: typeof GlideClient;
  let GlideClientConfigurationClass: { PubSubChannelModes: { Exact: number } };
  let timeUnit: typeof TimeUnit;

  try {
    const mod = await import("@valkey/valkey-glide");
    GlideClientClass = mod.GlideClient;
    // PubSubChannelModes isn't exported as a value type; cast to access the enum directly.
    const configClass = mod.GlideClientConfiguration as unknown as Record<string, unknown>;
    const pubSubModes = (configClass as { PubSubChannelModes?: { Exact?: number } })
      ?.PubSubChannelModes;
    if (pubSubModes?.Exact === undefined) {
      throw new Error(
        "GlideClientConfiguration.PubSubChannelModes.Exact is not available. " +
          "The installed version of @valkey/valkey-glide may be incompatible.",
      );
    }
    GlideClientConfigurationClass = configClass as { PubSubChannelModes: { Exact: number } };
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

  // Publisher adapter
  const publisher = {
    async connect() {},
    async publish(channel: string, message: string) {
      return client.publish(channel, message);
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

  // Subscriber adapter — one dedicated GlideClient per channel (Glide pub/sub requirement).
  const maxSubscriptions = options.maxSubscriptions ?? 1000;
  const subscriptionClients = new Map<string, GlideClient>();

  const subscriber = {
    async connect() {},
    async subscribe(channel: string, callback: (message: string) => void) {
      // Close any existing client for this channel to avoid resource leaks on duplicate calls
      const existing = subscriptionClients.get(channel);
      if (existing) {
        existing.close();
        subscriptionClients.delete(channel);
      }

      if (subscriptionClients.size >= maxSubscriptions) {
        throw new Error(
          `Maximum subscription limit (${maxSubscriptions}) reached. Unsubscribe from existing channels before subscribing to new ones.`,
        );
      }

      const subClient = await GlideClientClass.createClient({
        ...clientConfig,
        pubsubSubscriptions: {
          channelsAndPatterns: {
            [GlideClientConfigurationClass.PubSubChannelModes.Exact]: new Set([channel]),
          },
          callback: (msg: { message: unknown }, _ctx: unknown) => callback(msg.message as string),
        },
      });
      subscriptionClients.set(channel, subClient);
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
    async close() {
      const closePromises: Promise<void>[] = [];
      for (const subClient of subscriptionClients.values()) {
        closePromises.push(Promise.resolve(subClient.close()));
      }
      subscriptionClients.clear();
      await Promise.all(closePromises);
    },
  };
}

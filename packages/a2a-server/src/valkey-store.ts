import { randomUUID } from "node:crypto";
import type { GlideClient, GlideClusterClient, TimeUnit } from "@valkey/valkey-glide";
import { safeStringify } from "@voltagent/internal";
import { TaskRecordSchema } from "./schemas";
import type { TaskRecord, TaskStore } from "./types";

/**
 * Configuration options for {@link ValkeyTaskStore}.
 */
export interface ValkeyTaskStoreOptions {
  /** Valkey client instance (standalone {@link GlideClient} or {@link GlideClusterClient}). */
  client: GlideClient | GlideClusterClient;
  /** Key prefix for all task records stored in Valkey. Defaults to `"a2a-tasks"`. */
  keyPrefix?: string;
  /** Optional TTL in seconds applied to every persisted task record. Must be a positive finite number. */
  ttlSeconds?: number;
}

const VALKEY_GLIDE_REQUIRED =
  "@valkey/valkey-glide is required for ValkeyTaskStore. Install it with: pnpm add @valkey/valkey-glide";

/**
 * Creates a {@link ValkeyTaskStore} with eagerly-resolved Valkey dependencies.
 *
 * Validates `ttlSeconds` and pre-resolves the `TimeUnit.Seconds` enum from
 * `@valkey/valkey-glide` so that subsequent `save()` calls do not need to
 * perform a dynamic import.
 *
 * @param options - Store configuration including the Valkey client, optional key prefix, and TTL.
 * @returns A fully initialised {@link ValkeyTaskStore} instance.
 * @throws If `ttlSeconds` is provided but is not a positive finite number.
 * @throws If `@valkey/valkey-glide` is not installed when `ttlSeconds` is set.
 */
export async function createValkeyTaskStore(
  options: ValkeyTaskStoreOptions,
): Promise<ValkeyTaskStore> {
  if (
    options.ttlSeconds !== undefined &&
    (!Number.isFinite(options.ttlSeconds) || options.ttlSeconds <= 0)
  ) {
    throw new Error("ttlSeconds must be a positive finite number");
  }

  let timeUnitSeconds: TimeUnit | undefined;
  if (options.ttlSeconds !== undefined) {
    try {
      const mod = await import("@valkey/valkey-glide");
      timeUnitSeconds = mod.TimeUnit.Seconds;
    } catch {
      throw new Error(VALKEY_GLIDE_REQUIRED);
    }
  }
  return new ValkeyTaskStore(options, timeUnitSeconds);
}

/**
 * Valkey-backed implementation of {@link TaskStore}.
 *
 * **Important:** `activeCancellations` is an in-process `Set` and is **not** propagated across
 * server instances sharing the same Valkey backend. For cross-instance cancellation, `A2AServer`
 * would need to subscribe to a Valkey pub/sub channel for cancellation events instead of relying
 * on process-local `AbortController` signaling.
 */
export class ValkeyTaskStore implements TaskStore {
  private readonly client: GlideClient | GlideClusterClient;
  private readonly keyPrefix: string;
  private readonly ttlSeconds?: number;
  /** @internal */
  private timeUnitSeconds?: TimeUnit;

  // In-process only, not propagated across instances via Valkey.
  readonly activeCancellations = new Set<string>();

  /**
   * Creates a new ValkeyTaskStore.
   *
   * Prefer {@link createValkeyTaskStore} which eagerly resolves the Valkey
   * `TimeUnit` dependency. Direct construction is supported but the caller
   * must supply the resolved `timeUnitSeconds` when `ttlSeconds` is used.
   *
   * @param options - Store configuration.
   * @param timeUnitSeconds - Pre-resolved `TimeUnit.Seconds` value from `@valkey/valkey-glide`.
   * @throws If `ttlSeconds` is provided but is not a positive finite number.
   */
  constructor(options: ValkeyTaskStoreOptions, /** @internal */ timeUnitSeconds?: TimeUnit) {
    if (
      options.ttlSeconds !== undefined &&
      (!Number.isFinite(options.ttlSeconds) || options.ttlSeconds <= 0)
    ) {
      throw new Error("ttlSeconds must be a positive finite number");
    }
    this.client = options.client;
    this.keyPrefix = options.keyPrefix ?? "a2a-tasks";
    this.ttlSeconds = options.ttlSeconds;
    this.timeUnitSeconds = timeUnitSeconds;
  }

  /**
   * Lazily resolves and caches the `TimeUnit.Seconds` enum value from
   * `@valkey/valkey-glide`. Called internally by {@link save} when TTL is configured.
   */
  private async getTimeUnitSeconds(): Promise<TimeUnit> {
    if (this.timeUnitSeconds !== undefined) return this.timeUnitSeconds;
    try {
      const mod = await import("@valkey/valkey-glide");
      this.timeUnitSeconds = mod.TimeUnit.Seconds;
      return this.timeUnitSeconds;
    } catch {
      throw new Error(VALKEY_GLIDE_REQUIRED);
    }
  }

  /**
   * Loads a task record from Valkey by agent and task ID.
   *
   * @param params - The agent ID and task ID identifying the record.
   * @returns The deserialised {@link TaskRecord}, or `null` if not found.
   * @throws If the stored value cannot be parsed as valid JSON.
   */
  async load(params: { agentId: string; taskId: string }): Promise<TaskRecord | null> {
    const key = this.makeKey(params.agentId, params.taskId);
    const result = await this.client.get(key);
    if (result === null) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(String(result));
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to parse stored TaskRecord for key "${key}": ${detail}`);
    }

    const validation = TaskRecordSchema.safeParse(parsed);
    if (!validation.success) {
      throw new Error(
        `Invalid TaskRecord for key "${key}": ${safeStringify(validation.error.issues)}`,
      );
    }

    return validation.data;
  }

  /**
   * Persists a task record to Valkey.
   *
   * The record is serialised with {@link safeStringify} and stored under a
   * composite key derived from the agent ID and the record's task ID. When
   * `ttlSeconds` is configured the key is set with an expiry.
   *
   * Note: unlike {@link load}, `save` does **not** run Zod validation. The
   * caller is trusted to supply a well-typed `TaskRecord`, and skipping
   * validation on the write path avoids the per-call overhead. Any schema
   * drift will surface on the next `load()`.
   *
   * @param params - The agent ID and the {@link TaskRecord} to persist.
   */
  async save(params: { agentId: string; data: TaskRecord }): Promise<void> {
    const taskId = params.data.id ?? randomUUID();
    const normalized: TaskRecord =
      taskId === params.data.id ? params.data : { ...params.data, id: taskId };
    const key = this.makeKey(params.agentId, taskId);
    const json = safeStringify(normalized);

    if (this.ttlSeconds !== undefined) {
      const seconds = await this.getTimeUnitSeconds();
      await this.client.set(key, json, {
        expiry: { type: seconds, count: this.ttlSeconds },
      });
    } else {
      await this.client.set(key, json);
    }
  }

  /**
   * Builds the Valkey key for a given agent/task pair.
   *
   * Colons inside `agentId` and `taskId` are escaped to prevent collisions
   * with the `keyPrefix:agentId::taskId` delimiter scheme.
   */
  private makeKey(agentId: string, taskId: string): string {
    // Escape colons in user-provided IDs to prevent key collisions with the delimiter.
    const safeAgentId = agentId.replace(/:/g, "\\:");
    const safeTaskId = taskId.replace(/:/g, "\\:");
    return `${this.keyPrefix}:${safeAgentId}::${safeTaskId}`;
  }
}

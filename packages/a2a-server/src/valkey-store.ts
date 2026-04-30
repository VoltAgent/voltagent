import type { GlideClient, GlideClusterClient, TimeUnit } from "@valkey/valkey-glide";
import { safeStringify } from "@voltagent/internal";
import type { TaskRecord, TaskStore } from "./types";

export interface ValkeyTaskStoreOptions {
  client: GlideClient | GlideClusterClient;
  keyPrefix?: string;
  ttlSeconds?: number;
}

const VALKEY_GLIDE_REQUIRED =
  "@valkey/valkey-glide is required for ValkeyTaskStore. Install it with: pnpm add @valkey/valkey-glide";

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

  constructor(options: ValkeyTaskStoreOptions, /** @internal */ timeUnitSeconds?: TimeUnit) {
    this.client = options.client;
    this.keyPrefix = options.keyPrefix ?? "a2a-tasks";
    this.ttlSeconds = options.ttlSeconds;
    this.timeUnitSeconds = timeUnitSeconds;
  }

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

  async load(params: { agentId: string; taskId: string }): Promise<TaskRecord | null> {
    const key = this.makeKey(params.agentId, params.taskId);
    const result = await this.client.get(key);
    if (result === null) return null;
    try {
      return JSON.parse(String(result)) as TaskRecord;
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to parse stored TaskRecord for key "${key}": ${detail}`);
    }
  }

  async save(params: { agentId: string; data: TaskRecord }): Promise<void> {
    const key = this.makeKey(params.agentId, params.data.id);
    const json = safeStringify(params.data);

    if (this.ttlSeconds !== undefined) {
      const seconds = await this.getTimeUnitSeconds();
      await this.client.set(key, json, {
        expiry: { type: seconds, count: this.ttlSeconds },
      });
    } else {
      await this.client.set(key, json);
    }
  }

  private makeKey(agentId: string, taskId: string): string {
    return `${this.keyPrefix}:${agentId}::${taskId}`;
  }
}

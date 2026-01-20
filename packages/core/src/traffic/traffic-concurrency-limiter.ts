/**
 * TrafficConcurrencyLimiter
 * -------------------------
 *
 * This module implements **concurrency gating** for traffic requests.
 *
 * It answers three questions:
 *
 * 1. **Can this request start execution right now?**  (resolve)
 * 2. **If yes, mark its concurrency slots as occupied** (acquire)
 * 3. **When the request finishes, free those slots** (release)
 *
 * Concurrency is enforced across two *independent dimensions*:
 *
 * - Provider/Model concurrency
 *   Example: "openai:gpt-4o" may allow only N in-flight requests globally.
 *
 * - Tenant concurrency
 *   Example: tenant "acme" may allow only M concurrent requests.
 *
 * A request must pass **all enabled gates** to proceed.
 * If any gate is saturated, the request must wait.
 *
 * IMPORTANT:
 * - This class does NOT queue or schedule requests.
 * - It only tracks counts and returns decisions.
 * - Higher layers decide *when* to retry.
 */

import type { Logger } from "../logger";
import type { QueuedRequest } from "./traffic-controller-internal";
import type {
  ProviderModelConcurrencyLimit,
  TenantConcurrencyLimit,
  TrafficRequestMetadata,
} from "./traffic-types";

/**
 * Structured explanation for *why* a request is blocked.
 * Returned to callers so they can log, inspect, or make policy decisions.
 */
export type ConcurrencyBlockReason =
  | {
      gate: "providerModel"; // provider+model gate blocked
      key: string; // resolved provider/model key
      inFlight: number; // current number of active requests
      limit: number; // allowed concurrency limit
    }
  | {
      gate: "tenant"; // tenant gate blocked
      key: string; // tenant id
      inFlight: number;
      limit: number;
    };

/**
 * Decision returned by `resolve(...)`.
 *
 * - allow → caller may immediately acquire slots and execute
 * - wait  → caller must pause; includes precise blocking reasons
 */
export type ConcurrencyDecision =
  | { kind: "allow" }
  | { kind: "wait"; reasons: ConcurrencyBlockReason[] };

/**
 * Normalize user-provided limits into a safe integer.
 *
 * Rules:
 * - undefined / null  → undefined (gate disabled)
 * - non-numeric       → undefined
 * - <= 0              → 0 (explicitly blocks all concurrency)
 * - otherwise         → floored integer
 */
function toNonNegativeIntegerLimit(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return undefined;
  if (n <= 0) return 0;
  return Math.floor(n);
}

/**
 * Helpers for managing in-flight counters stored in Maps.
 *
 * Maps are sparse:
 * - key absent   → zero in-flight
 * - key present  → positive integer count
 */
function getInFlight(map: Map<string, number>, key: string): number {
  return map.get(key) ?? 0;
}

function incrementInFlight(map: Map<string, number>, key: string): void {
  map.set(key, getInFlight(map, key) + 1);
}

function decrementInFlight(map: Map<string, number>, key: string): void {
  const current = getInFlight(map, key);
  if (current <= 1) {
    map.delete(key); // avoid unbounded key growth
    return;
  }
  map.set(key, current - 1);
}

/**
 * TrafficConcurrencyLimiter
 * ------------------------
 *
 * Owns all concurrency state.
 *
 * This object is expected to live as long as the TrafficController.
 * Its Maps represent *live in-flight requests only*.
 */
export class TrafficConcurrencyLimiter {
  /**
   * Tracks concurrent requests per provider+model key.
   * Example key: "openai:gpt-4o"
   */
  private readonly inFlightByProviderModel = new Map<string, number>();

  /**
   * Tracks concurrent requests per tenant.
   * Example key: "tenant-123"
   */
  private readonly inFlightByTenant = new Map<string, number>();
  private readonly providerModelLimitCache = new Map<string, number>();
  private readonly tenantLimitCache = new Map<string, number>();

  /**
   * Function that converts request metadata into a stable provider/model key.
   * Injected so key semantics are owned by higher-level policy.
   */
  private readonly buildProviderModelKey: (metadata?: TrafficRequestMetadata) => string;

  /**
   * User-supplied concurrency policies.
   * May be:
   * - a constant number
   * - a function resolver
   * - a per-key map
   */
  private readonly providerModelLimit?: ProviderModelConcurrencyLimit;
  private readonly tenantLimit?: TenantConcurrencyLimit;

  /**
   * Cached booleans to avoid repeated undefined checks on hot paths.
   */
  private readonly providerModelEnabled: boolean;
  private readonly tenantEnabled: boolean;

  constructor(options: {
    buildProviderModelKey: (metadata?: TrafficRequestMetadata) => string;
    maxConcurrentPerProviderModel?: ProviderModelConcurrencyLimit;
    maxConcurrentPerTenant?: TenantConcurrencyLimit;
  }) {
    this.buildProviderModelKey = options.buildProviderModelKey;
    this.providerModelLimit = options.maxConcurrentPerProviderModel;
    this.tenantLimit = options.maxConcurrentPerTenant;

    this.providerModelEnabled = options.maxConcurrentPerProviderModel !== undefined;
    this.tenantEnabled = options.maxConcurrentPerTenant !== undefined;
  }

  /**
   * resolve(...)
   * ------------
   *
   * Pure decision step.
   *
   * Reads current in-flight counts and answers:
   * "If this request started *now*, would it violate any concurrency limits?"
   *
   * IMPORTANT:
   * - Stores resolved keys on the request for acquire/release symmetry.
   * - Must be followed by acquire(...) if allowed.
   */
  resolve(next: QueuedRequest, logger?: Logger): ConcurrencyDecision {
    if (!this.providerModelEnabled && !this.tenantEnabled) {
      return { kind: "allow" };
    }

    const concurrencyLogger = logger?.child({ module: "concurrency-limiter" });
    const reasons: ConcurrencyBlockReason[] = [];

    // --- Provider/Model gate -----------------------------------------------
    if (this.providerModelEnabled) {
      const providerModelKey = this.buildProviderModelKey(next.request.metadata);
      next.providerModelConcurrencyKey = providerModelKey;
      const providerModelLimit = this.resolveProviderModelLimit(
        providerModelKey,
        next.request.metadata,
        concurrencyLogger,
      );

      if (providerModelLimit !== undefined) {
        const inFlight = getInFlight(this.inFlightByProviderModel, providerModelKey);
        if (inFlight >= providerModelLimit) {
          reasons.push({
            gate: "providerModel",
            key: providerModelKey,
            inFlight,
            limit: providerModelLimit,
          });
        }
      }
    }

    // --- Tenant gate --------------------------------------------------------
    if (this.tenantEnabled) {
      const tenantKey = next.tenantId;
      next.tenantConcurrencyKey = tenantKey;
      const tenantLimit = this.resolveTenantLimit(
        tenantKey,
        next.request.metadata,
        concurrencyLogger,
      );

      if (tenantLimit !== undefined) {
        const inFlight = getInFlight(this.inFlightByTenant, tenantKey);
        if (inFlight >= tenantLimit) {
          reasons.push({
            gate: "tenant",
            key: tenantKey,
            inFlight,
            limit: tenantLimit,
          });
        }
      }
    }

    if (reasons.length === 0) {
      return { kind: "allow" };
    }

    concurrencyLogger?.trace?.("Concurrency gate blocked request", {
      tenantId: next.tenantId,
      reasons,
    });

    return { kind: "wait", reasons };
  }

  /**
   * acquire(...)
   * ------------
   *
   * Marks concurrency slots as occupied.
   *
   * MUST only be called after resolve(...) returned { kind: "allow" }.
   *
   * Side effects:
   * - increments in-flight counters
   * - stores the exact keys on the request for safe release later
   */
  acquire(next: QueuedRequest, logger?: Logger): void {
    if (!this.providerModelEnabled && !this.tenantEnabled) return;

    const concurrencyLogger = logger?.child({ module: "concurrency-limiter" });

    let tenantKey: string | undefined;
    if (this.tenantEnabled) {
      tenantKey = next.tenantConcurrencyKey ?? next.tenantId;
      next.tenantConcurrencyKey = tenantKey;
      incrementInFlight(this.inFlightByTenant, tenantKey);
    }

    let providerModelKey: string | undefined;
    if (this.providerModelEnabled) {
      providerModelKey =
        next.providerModelConcurrencyKey ?? this.buildProviderModelKey(next.request.metadata);
      next.providerModelConcurrencyKey = providerModelKey;
      incrementInFlight(this.inFlightByProviderModel, providerModelKey);
    }

    concurrencyLogger?.trace?.("Concurrency slots acquired", {
      tenantId: tenantKey,
      tenantInFlight: tenantKey ? getInFlight(this.inFlightByTenant, tenantKey) : undefined,
      providerModelKey,
      providerModelInFlight: providerModelKey
        ? getInFlight(this.inFlightByProviderModel, providerModelKey)
        : undefined,
    });
  }

  /**
   * release(...)
   * ------------
   *
   * Frees previously acquired concurrency slots.
   *
   * Safe to call exactly once per acquire(...).
   * Keys are read from the request to ensure symmetry even if metadata changes.
   */
  release(next: QueuedRequest, logger?: Logger): void {
    const concurrencyLogger = logger?.child({ module: "concurrency-limiter" });

    const tenantKey = next.tenantConcurrencyKey;
    const providerModelKey = next.providerModelConcurrencyKey;

    if (tenantKey) {
      decrementInFlight(this.inFlightByTenant, tenantKey);
    }

    if (providerModelKey) {
      decrementInFlight(this.inFlightByProviderModel, providerModelKey);
    }

    if (tenantKey || providerModelKey) {
      concurrencyLogger?.trace?.("Concurrency slots released", {
        tenantId: tenantKey,
        tenantInFlight: tenantKey ? getInFlight(this.inFlightByTenant, tenantKey) : undefined,
        providerModelKey,
        providerModelInFlight: providerModelKey
          ? getInFlight(this.inFlightByProviderModel, providerModelKey)
          : undefined,
      });
    }

    // Clear keys to prevent accidental double-release
    next.tenantConcurrencyKey = undefined;
    next.providerModelConcurrencyKey = undefined;
  }

  /**
   * Resolve tenant concurrency limit for a specific request.
   *
   * Supports:
   * - constant number
   * - function (tenantId, metadata) => number
   * - per-tenant map
   *
   * Errors in user functions are logged and treated as "no limit".
   */
  private resolveTenantLimit(
    tenantId: string,
    metadata: TrafficRequestMetadata | undefined,
    logger?: Logger,
  ): number | undefined {
    const policy = this.tenantLimit;
    if (policy === undefined) return undefined;

    if (typeof policy === "number") {
      return toNonNegativeIntegerLimit(policy);
    }

    if (typeof policy === "function") {
      try {
        const resolved = toNonNegativeIntegerLimit(policy(tenantId, metadata));
        if (resolved === undefined) {
          this.tenantLimitCache.delete(tenantId);
        } else {
          this.tenantLimitCache.set(tenantId, resolved);
        }
        return resolved;
      } catch (error) {
        const cachedLimit = this.tenantLimitCache.get(tenantId);
        logger?.warn?.("Tenant concurrency resolver threw; using cached limit", {
          tenantId,
          cachedLimit,
          errorName: (error as { name?: unknown } | null)?.name,
          errorMessage: (error as { message?: unknown } | null)?.message,
        });
        return cachedLimit;
      }
    }

    return toNonNegativeIntegerLimit(policy[tenantId]);
  }

  /**
   * Resolve provider/model concurrency limit for a specific request.
   *
   * Key is already precomputed to ensure consistency between resolve/acquire.
   */
  private resolveProviderModelLimit(
    key: string,
    metadata: TrafficRequestMetadata | undefined,
    logger?: Logger,
  ): number | undefined {
    const policy = this.providerModelLimit;
    if (policy === undefined) return undefined;

    if (typeof policy === "number") {
      return toNonNegativeIntegerLimit(policy);
    }

    if (typeof policy === "function") {
      try {
        const resolved = toNonNegativeIntegerLimit(policy(metadata, key));
        if (resolved === undefined) {
          this.providerModelLimitCache.delete(key);
        } else {
          this.providerModelLimitCache.set(key, resolved);
        }
        return resolved;
      } catch (error) {
        const cachedLimit = this.providerModelLimitCache.get(key);
        logger?.warn?.("Provider/model concurrency resolver threw; using cached limit", {
          key,
          provider: metadata?.provider,
          model: metadata?.model,
          cachedLimit,
          errorName: (error as { name?: unknown } | null)?.name,
          errorMessage: (error as { message?: unknown } | null)?.message,
        });
        return cachedLimit;
      }
    }

    return toNonNegativeIntegerLimit(policy[key]);
  }
}

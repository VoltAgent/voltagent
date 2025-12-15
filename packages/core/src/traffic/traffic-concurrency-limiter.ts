import type { Logger } from "../logger";
import type { QueuedRequest } from "./traffic-controller-internal";
import type {
  ProviderModelConcurrencyLimit,
  TenantConcurrencyLimit,
  TrafficRequestMetadata,
} from "./traffic-types";

export type ConcurrencyBlockReason =
  | {
      gate: "providerModel";
      key: string;
      inFlight: number;
      limit: number;
    }
  | {
      gate: "tenant";
      key: string;
      inFlight: number;
      limit: number;
    };

export type ConcurrencyDecision =
  | { kind: "allow" }
  | { kind: "wait"; reasons: ConcurrencyBlockReason[] };

function toNonNegativeIntegerLimit(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return undefined;
  if (n <= 0) return 0;
  return Math.floor(n);
}

function getInFlight(map: Map<string, number>, key: string): number {
  return map.get(key) ?? 0;
}

function incrementInFlight(map: Map<string, number>, key: string): void {
  map.set(key, getInFlight(map, key) + 1);
}

function decrementInFlight(map: Map<string, number>, key: string): void {
  const current = getInFlight(map, key);
  if (current <= 1) {
    map.delete(key);
    return;
  }
  map.set(key, current - 1);
}

export class TrafficConcurrencyLimiter {
  private readonly inFlightByProviderModel = new Map<string, number>();
  private readonly inFlightByTenant = new Map<string, number>();

  private readonly buildProviderModelKey: (metadata?: TrafficRequestMetadata) => string;
  private readonly providerModelLimit?: ProviderModelConcurrencyLimit;
  private readonly tenantLimit?: TenantConcurrencyLimit;
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

  resolve(next: QueuedRequest, logger?: Logger): ConcurrencyDecision {
    if (!this.providerModelEnabled && !this.tenantEnabled) return { kind: "allow" };
    const concurrencyLogger = logger?.child({ module: "concurrency-limiter" });
    const reasons: ConcurrencyBlockReason[] = [];

    if (this.providerModelEnabled) {
      const providerModelKey = this.buildProviderModelKey(next.request.metadata);
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

    if (this.tenantEnabled) {
      const tenantKey = next.tenantId;
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

    if (reasons.length === 0) return { kind: "allow" };

    concurrencyLogger?.trace?.("Concurrency gate blocked request", {
      tenantId: next.tenantId,
      reasons,
    });
    return { kind: "wait", reasons };
  }

  acquire(next: QueuedRequest, logger?: Logger): void {
    if (!this.providerModelEnabled && !this.tenantEnabled) return;
    const concurrencyLogger = logger?.child({ module: "concurrency-limiter" });

    let tenantKey: string | undefined;
    if (this.tenantEnabled) {
      tenantKey = next.tenantId;
      next.tenantConcurrencyKey = tenantKey;
      incrementInFlight(this.inFlightByTenant, tenantKey);
    }

    let providerModelKey: string | undefined;
    if (this.providerModelEnabled) {
      providerModelKey = this.buildProviderModelKey(next.request.metadata);
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

    next.tenantConcurrencyKey = undefined;
    next.providerModelConcurrencyKey = undefined;
  }

  private resolveTenantLimit(
    tenantId: string,
    metadata: TrafficRequestMetadata | undefined,
    logger?: Logger,
  ): number | undefined {
    const policy = this.tenantLimit;
    if (policy === undefined) return undefined;

    if (typeof policy === "number") return toNonNegativeIntegerLimit(policy);
    if (typeof policy === "function") {
      try {
        return toNonNegativeIntegerLimit(policy(tenantId, metadata));
      } catch (error) {
        logger?.warn?.("Tenant concurrency resolver threw; ignoring", {
          tenantId,
          errorName: (error as { name?: unknown } | null)?.name,
          errorMessage: (error as { message?: unknown } | null)?.message,
        });
        return undefined;
      }
    }

    return toNonNegativeIntegerLimit(policy[tenantId]);
  }

  private resolveProviderModelLimit(
    key: string,
    metadata: TrafficRequestMetadata | undefined,
    logger?: Logger,
  ): number | undefined {
    const policy = this.providerModelLimit;
    if (policy === undefined) return undefined;

    if (typeof policy === "number") return toNonNegativeIntegerLimit(policy);
    if (typeof policy === "function") {
      try {
        return toNonNegativeIntegerLimit(policy(metadata, key));
      } catch (error) {
        logger?.warn?.("Provider/model concurrency resolver threw; ignoring", {
          key,
          provider: metadata?.provider,
          model: metadata?.model,
          errorName: (error as { name?: unknown } | null)?.name,
          errorMessage: (error as { message?: unknown } | null)?.message,
        });
        return undefined;
      }
    }

    return toNonNegativeIntegerLimit(policy[key]);
  }
}

import type { Logger } from "../logger";
import type { QueuedRequest } from "./traffic-controller-internal";
import { isPromiseLike } from "./traffic-error-utils";
import type { TenantUsage } from "./traffic-types";

type UsageCounters = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export class TrafficUsageTracker {
  private readonly tenantUsage = new Map<string, TenantUsage>();

  getTenantUsage(tenantId: string): TenantUsage | undefined {
    const usage = this.tenantUsage.get(tenantId);
    return usage ? { ...usage } : undefined;
  }

  recordUsage<TResponse>(
    item: QueuedRequest<TResponse>,
    result: TResponse,
    logger?: Logger,
  ): UsageCounters | Promise<UsageCounters | undefined> | undefined {
    const usageLogger = logger?.child({ module: "usage-tracker" });
    const extractor = item.extractUsage ?? item.request.extractUsage;
    if (!extractor) {
      usageLogger?.trace?.("No usage extractor; skipping usage", { tenantId: item.tenantId });
      return undefined;
    }

    const usage = extractor(result);
    if (!usage) {
      usageLogger?.trace?.("Usage extractor returned empty; skipping usage", {
        tenantId: item.tenantId,
      });
      return undefined;
    }

    if (isPromiseLike(usage)) {
      usageLogger?.trace?.("Usage extractor returned promise; awaiting", {
        tenantId: item.tenantId,
      });
      void usage.then((u) => u && this.incrementTenantUsage(item.tenantId, u, usageLogger));
      return usage;
    }
    this.incrementTenantUsage(item.tenantId, usage, usageLogger);
    return usage;
  }

  private incrementTenantUsage(tenantId: string, usage: UsageCounters, logger?: Logger): void {
    const current = this.tenantUsage.get(tenantId) ?? {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };

    const input =
      typeof usage.inputTokens === "number" && Number.isFinite(usage.inputTokens)
        ? usage.inputTokens
        : 0;
    const output =
      typeof usage.outputTokens === "number" && Number.isFinite(usage.outputTokens)
        ? usage.outputTokens
        : 0;
    const total =
      typeof usage.totalTokens === "number" && Number.isFinite(usage.totalTokens)
        ? usage.totalTokens
        : input + output;

    this.tenantUsage.set(tenantId, {
      inputTokens: current.inputTokens + input,
      outputTokens: current.outputTokens + output,
      totalTokens: current.totalTokens + total,
    });

    logger?.debug?.("Tenant usage incremented", {
      tenantId,
      delta: { inputTokens: input, outputTokens: output, totalTokens: total },
      total: this.tenantUsage.get(tenantId),
    });
  }
}

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

  recordUsage<TResponse>(item: QueuedRequest<TResponse>, result: TResponse): void {
    const extractor = item.extractUsage ?? item.request.extractUsage;
    if (!extractor) return;

    const usage = extractor(result);
    if (!usage) return;

    if (isPromiseLike(usage)) {
      void usage.then((u) => u && this.incrementTenantUsage(item.tenantId, u));
    } else {
      this.incrementTenantUsage(item.tenantId, usage);
    }
  }

  private incrementTenantUsage(tenantId: string, usage: UsageCounters): void {
    const current = this.tenantUsage.get(tenantId) ?? {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };

    const input = usage.inputTokens ?? 0;
    const output = usage.outputTokens ?? 0;
    const total = usage.totalTokens ?? input + output;

    this.tenantUsage.set(tenantId, {
      inputTokens: current.inputTokens + input,
      outputTokens: current.outputTokens + output,
      totalTokens: current.totalTokens + total,
    });
  }
}

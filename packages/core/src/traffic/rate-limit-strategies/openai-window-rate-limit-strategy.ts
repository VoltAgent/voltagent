import type { Logger } from "../../logger";
import type { DispatchDecision, QueuedRequest } from "../traffic-controller-internal";
import type { TrafficRequestMetadata } from "../traffic-types";
import { DefaultRateLimitStrategy } from "./default-rate-limit-strategy";
import type { RateLimitStrategy, RateLimitUpdateResult } from "./rate-limit-strategy";

export class OpenAIWindowRateLimitStrategy implements RateLimitStrategy {
  private readonly window: DefaultRateLimitStrategy;
  private readonly key: string;
  private bootstrapReserved = 0;

  constructor(key: string) {
    this.key = key;
    this.window = new DefaultRateLimitStrategy(key);
  }

  resolve(next: QueuedRequest, logger?: Logger): DispatchDecision | null {
    const decision = this.window.resolve(next, logger);
    if (decision) return decision;

    if (next.rateLimitKey) {
      return null;
    }

    const rateLimitLogger = logger?.child({ module: "rate-limiter" });
    if (this.bootstrapReserved >= 1) {
      rateLimitLogger?.debug?.("OpenAI rate limit bootstrap active; waiting", {
        rateLimitKey: this.key,
        bootstrapReserved: this.bootstrapReserved,
      });
      return { kind: "wait" };
    }

    this.bootstrapReserved += 1;
    next.rateLimitKey = this.key;
    rateLimitLogger?.debug?.("OpenAI rate limit bootstrap reserved", {
      rateLimitKey: this.key,
      bootstrapReserved: this.bootstrapReserved,
    });
    return null;
  }

  onDispatch(logger?: Logger): void {
    this.window.onDispatch(logger);
  }

  onComplete(logger?: Logger): void {
    if (this.bootstrapReserved > 0) {
      this.bootstrapReserved -= 1;
    }
    this.window.onComplete(logger);
  }

  updateFromHeaders(
    metadata: TrafficRequestMetadata | undefined,
    headers: unknown,
    logger?: Logger,
  ): RateLimitUpdateResult | undefined {
    return this.window.updateFromHeaders(metadata, headers, logger);
  }
}

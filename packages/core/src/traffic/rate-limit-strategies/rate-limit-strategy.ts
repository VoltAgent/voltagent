import type { Logger } from "../../logger";
import type {
  DispatchDecision,
  QueuedRequest,
  RateLimitWindowState,
} from "../traffic-controller-internal";
import type { TrafficRequestMetadata } from "../traffic-types";

export type RateLimitHeaderSnapshot = {
  limitRequests?: string;
  remainingRequests?: string;
  resetRequests?: string;
  resetRequestsMs?: number;
  retryAfter?: string;
  retryAfterMs?: number;
};

export type RateLimitUpdateResult = {
  key: string;
  headerSnapshot: RateLimitHeaderSnapshot;
  state: RateLimitWindowState;
};

export interface RateLimitStrategy {
  resolve(next: QueuedRequest, logger?: Logger): DispatchDecision | null;
  onDispatch(logger?: Logger): void;
  onComplete(logger?: Logger): void;
  updateFromHeaders(
    metadata: TrafficRequestMetadata | undefined,
    headers: unknown,
    logger?: Logger,
  ): RateLimitUpdateResult | undefined;
}

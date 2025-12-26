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
  limitTokens?: string;
  remainingTokens?: string;
  resetTokens?: string;
  resetTokensMs?: number;
  retryAfter?: string;
  retryAfterMs?: number;
};

export type RateLimitUpdateResult = {
  key: string;
  headerSnapshot: RateLimitHeaderSnapshot;
  state: RateLimitWindowState;
};

export type RateLimitUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export interface RateLimitStrategy {
  readonly handlesTokenLimits?: boolean;
  resolve(next: QueuedRequest, logger?: Logger): DispatchDecision | null;
  onDispatch(logger?: Logger): void;
  onComplete(logger?: Logger): void;
  recordUsage?(usage: RateLimitUsage, logger?: Logger, reservedTokens?: number): void;
  updateFromHeaders(
    metadata: TrafficRequestMetadata | undefined,
    headers: unknown,
    logger?: Logger,
  ): RateLimitUpdateResult | undefined;
}

export const MAX_RETRY_ATTEMPTS = 3;
export const TIMEOUT_RETRY_ATTEMPTS = 2;

export const RATE_LIMIT_BASE_BACKOFF_MS = 500;
export const SERVER_ERROR_BASE_BACKOFF_MS = 1000;
export const TIMEOUT_BASE_BACKOFF_MS = 750;

export const RATE_LIMIT_JITTER_FACTOR = 0.35;
export const SERVER_ERROR_JITTER_FACTOR = 0.8;
export const TIMEOUT_JITTER_FACTOR = 0.5;

export const CIRCUIT_FAILURE_THRESHOLD = 5;
export const CIRCUIT_FAILURE_WINDOW_MS = 10_000;
export const CIRCUIT_COOLDOWN_MS = 30_000;

export const RATE_LIMIT_EXHAUSTION_BUFFER = 1;
export const RATE_LIMIT_PROBE_DELAY_MS = 50;
export const RATE_LIMIT_MIN_PACE_INTERVAL_MS = 10;
export const RATE_LIMIT_NEXT_ALLOWED_UPDATE_THRESHOLD_MS = 10;

export const DEFAULT_FALLBACK_CHAINS: Record<string, string[]> = {
  "gpt-4o": ["gpt-4o-mini", "gpt-3.5"],
};

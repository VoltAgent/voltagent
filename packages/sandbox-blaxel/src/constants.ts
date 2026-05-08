/**
 * Default `defaultTimeoutMs` (60 seconds).
 */
export const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Default `maxOutputBytes` (5 MiB).
 */
export const DEFAULT_MAX_OUTPUT_BYTES = 5 * 1024 * 1024;

/**
 * Default `pollIntervalMs` (250 ms).
 */
export const DEFAULT_POLL_INTERVAL_MS = 250;

/**
 * Safety cap on `process.wait()` `maxWait` when `timeoutMs: 0` is set.
 * 24h — prevents runaway poll loops if a process never terminates.
 */
export const NO_TIMEOUT_MAX_WAIT_MS = 24 * 60 * 60 * 1000;

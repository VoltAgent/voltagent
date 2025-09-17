/**
 * Type guard to check if an error is an AbortError
 */
export function isAbortError(error: unknown): error is AbortError {
  return error instanceof AbortError;
}

/**
 * Creates an AbortError.
 * @param reason - The reason for the abort.
 * @returns
 */
export function createAbortError(reason?: string): AbortError {
  return new AbortError(reason);
}

/**
 * Error thrown when an operation is aborted via AbortController
 */
export class AbortError extends Error {
  name: "AbortError";
  /** The reason passed to abort() method */
  reason?: unknown;

  constructor(reason?: string) {
    super(`Operation aborted: ${reason ?? "unknown reason"}`);
    this.name = "AbortError";
    this.reason = reason ?? "unknown reason";
  }
}

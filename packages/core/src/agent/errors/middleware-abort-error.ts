export type MiddlewareAbortOptions<TMetadata = unknown> = {
  retry?: boolean;
  metadata?: TMetadata;
};

/**
 * Error thrown by middleware abort() calls.
 */
export class MiddlewareAbortError<TMetadata = unknown> extends Error {
  name: "MiddlewareAbortError";
  retry?: boolean;
  metadata?: TMetadata;
  middlewareId?: string;

  constructor(reason: string, options?: MiddlewareAbortOptions<TMetadata>, middlewareId?: string) {
    super(reason);
    this.name = "MiddlewareAbortError";
    this.retry = options?.retry;
    this.metadata = options?.metadata;
    this.middlewareId = middlewareId;
  }
}

export function createMiddlewareAbortError<TMetadata = unknown>(
  reason: string,
  options?: MiddlewareAbortOptions<TMetadata>,
  middlewareId?: string,
): MiddlewareAbortError<TMetadata> {
  return new MiddlewareAbortError(reason, options, middlewareId);
}

export function isMiddlewareAbortError(error: unknown): error is MiddlewareAbortError {
  return error instanceof MiddlewareAbortError;
}

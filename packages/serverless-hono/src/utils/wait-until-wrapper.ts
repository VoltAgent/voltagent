type VoltAgentGlobal = typeof globalThis & {
  ___voltagent_wait_until?: (promise: Promise<unknown>) => void;
};

/**
 * Context that may contain a waitUntil function
 */
export interface WaitUntilContext {
  waitUntil?: (promise: Promise<unknown>) => void;
}

/**
 * Extracts waitUntil from context and sets it as global for observability
 * Returns a cleanup function to restore previous state
 *
 * @param context - Context object that may contain waitUntil
 * @returns Cleanup function to restore previous state
 *
 * @example
 * ```ts
 * const cleanup = withWaitUntil(executionCtx);
 * try {
 *   return await processRequest(request);
 * } finally {
 *   cleanup();
 * }
 * ```
 */
export function withWaitUntil(context?: WaitUntilContext | null): () => void {
  const globals = globalThis as VoltAgentGlobal;
  const previousWaitUntil = globals.___voltagent_wait_until;

  const waitUntil = context?.waitUntil;

  if (waitUntil && typeof waitUntil === "function") {
    globals.___voltagent_wait_until = (promise) => {
      try {
        waitUntil(promise);
      } catch {
        // Silently fail if waitUntil throws
        void promise;
      }
    };
  }

  // Return cleanup function
  return () => {
    if (waitUntil) {
      if (previousWaitUntil) {
        globals.___voltagent_wait_until = previousWaitUntil;
      } else {
        globals.___voltagent_wait_until = undefined;
      }
    }
  };
}

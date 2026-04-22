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

  const currentWaitUntil = context?.waitUntil;

  if (currentWaitUntil && typeof currentWaitUntil === "function") {
    // Bind to context to avoid "Illegal invocation" errors
    // Wrap in try/catch so errors (like DataCloneError) are swallowed and don't break the caller
    const boundWaitUntil = currentWaitUntil.bind(context);
    globals.___voltagent_wait_until = (promise: Promise<unknown>) => {
      try {
        boundWaitUntil(promise);
      } catch {
        // Swallow errors to avoid breaking the caller
      }
    };
  }
  // No else branch — don't touch global when context has no waitUntil,
  // to avoid destroying a previously set value from an outer scope

  // Return cleanup function that always restores the previous state
  return () => {
    globals.___voltagent_wait_until = previousWaitUntil;
  };
}

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
    // And allow errors (like DataCloneError) to propagate so caller can handle fallback
    globals.___voltagent_wait_until = currentWaitUntil.bind(context);
  } else {
    globals.___voltagent_wait_until = undefined;
  }

  // Return cleanup function
  return () => {
    if (currentWaitUntil) {
      if (previousWaitUntil) {
        globals.___voltagent_wait_until = previousWaitUntil;
      } else {
        globals.___voltagent_wait_until = undefined;
      }
    }
  };
}

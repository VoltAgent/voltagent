const getAbortError = (signal?: AbortSignal): Error | undefined => {
  if (!signal?.aborted) {
    return undefined;
  }

  const reason = (signal as AbortSignal & { reason?: unknown }).reason;
  const typedReason =
    typeof reason === "object" && reason !== null && "type" in reason
      ? (reason as { type?: string }).type
      : reason;

  if (typedReason === "cancelled") {
    return new Error("WORKFLOW_CANCELLED");
  }

  return new Error("WORKFLOW_SUSPENDED");
};

export const throwIfAborted = (signal?: AbortSignal) => {
  const error = getAbortError(signal);
  if (error) {
    throw error;
  }
};

export const waitWithSignal = (ms: number, signal?: AbortSignal) => {
  const durationMs = Number.isFinite(ms) ? Math.max(0, ms) : 0;

  if (!signal) {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, durationMs);
    });
  }

  return new Promise<void>((resolve, reject) => {
    const abortError = () => getAbortError(signal) || new Error("WORKFLOW_SUSPENDED");

    if (signal.aborted) {
      reject(abortError());
      return;
    }

    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, durationMs);

    const onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      reject(abortError());
    };

    signal.addEventListener("abort", onAbort, { once: true });
  });
};

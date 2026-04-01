import type { ToolExecuteOptions } from "../agent/providers/base/types";

const DEFAULT_TIMEOUT_MESSAGE = "Workspace operation timed out.";
const DEFAULT_ABORT_MESSAGE = "Workspace operation aborted.";

const resolveAbortSignal = (options?: ToolExecuteOptions): AbortSignal | undefined => {
  return options?.toolContext?.abortSignal ?? options?.abortController?.signal;
};

export const withOperationTimeout = async <T>(
  task: () => Promise<T>,
  options: ToolExecuteOptions | undefined,
  timeoutMs?: number,
): Promise<T> => {
  if (!timeoutMs || timeoutMs <= 0) {
    return await task();
  }

  const abortSignal = resolveAbortSignal(options);
  if (abortSignal?.aborted) {
    throw new Error(DEFAULT_ABORT_MESSAGE);
  }

  let timeoutId: NodeJS.Timeout | undefined;
  let cleanupAbort: (() => void) | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(DEFAULT_TIMEOUT_MESSAGE)), timeoutMs);
  });

  const abortPromise = abortSignal
    ? new Promise<never>((_, reject) => {
        const onAbort = () => reject(new Error(DEFAULT_ABORT_MESSAGE));
        abortSignal.addEventListener("abort", onAbort, { once: true });
        cleanupAbort = () => abortSignal.removeEventListener("abort", onAbort);
      })
    : null;

  try {
    const races: Array<Promise<T> | Promise<never>> = [task(), timeoutPromise];
    if (abortPromise) {
      races.push(abortPromise);
    }
    return await Promise.race(races);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (cleanupAbort) {
      cleanupAbort();
    }
  }
};

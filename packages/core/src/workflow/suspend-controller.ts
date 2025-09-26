import type { WorkflowSuspendController } from "./types";

/**
 * Creates a workflow suspension controller that can be used to externally suspend a running workflow.
 *
 * @example
 * ```typescript
 * import { createSuspendController } from "@voltagent/core";
 *
 * // Create controller
 * const controller = createSuspendController();
 *
 * // Run workflow with controller
 * const execution = await workflow.run(input, { suspendController: controller });
 *
 * // Suspend from outside
 * controller.suspend("Waiting for approval");
 *
 * // Check status
 * if (controller.isSuspended()) {
 *   console.log("Suspended because:", controller.getReason());
 * }
 * ```
 */
export function createSuspendController(): WorkflowSuspendController {
  const abortController = new AbortController();
  let suspensionReason: string | undefined;
  let cancellationReason: string | undefined;
  let suspended = false;
  let cancelled = false;

  const triggerAbort = (type: "suspended" | "cancelled") => {
    if (!abortController.signal.aborted) {
      abortController.abort({
        type,
        reason: type === "cancelled" ? cancellationReason : suspensionReason,
      });
    }
  };

  return {
    signal: abortController.signal,
    suspend: (reason?: string) => {
      if (!suspended && !cancelled) {
        suspensionReason = reason;
        suspended = true;
        triggerAbort("suspended");
      }
    },
    cancel: (reason?: string) => {
      if (!cancelled) {
        cancellationReason = reason;
        cancelled = true;
        triggerAbort("cancelled");
      }
    },
    isSuspended: () => suspended,
    isCancelled: () => cancelled,
    getReason: () => (cancelled ? cancellationReason : suspensionReason),
    getCancelReason: () => cancellationReason,
  };
}

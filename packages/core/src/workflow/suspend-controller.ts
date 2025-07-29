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
  let suspended = false;

  return {
    signal: abortController.signal,
    suspend: (reason?: string) => {
      if (!suspended) {
        suspensionReason = reason;
        suspended = true;
        abortController.abort();
      }
    },
    isSuspended: () => suspended,
    getReason: () => suspensionReason,
  };
}

import type { WorkflowExecuteContext } from "../internal/types";
import { defaultStepConfig } from "../internal/utils";
import { waitWithSignal } from "./signal";
import type { WorkflowStepSleep, WorkflowStepSleepConfig } from "./types";

/**
 * Creates a sleep step for the workflow
 *
 * @example
 * ```ts
 * const w = createWorkflow(
 *   andSleep({ id: "pause", duration: 500 }),
 *   andThen({ id: "next", execute: async ({ data }) => ({ ...data }) })
 * );
 * ```
 */
export function andSleep<INPUT, DATA>({
  duration,
  ...config
}: WorkflowStepSleepConfig<INPUT, DATA>) {
  return {
    ...defaultStepConfig(config),
    type: "sleep",
    duration,
    execute: async (context: WorkflowExecuteContext<INPUT, DATA, any, any>) => {
      const durationMs = typeof duration === "function" ? await duration(context) : duration;
      await waitWithSignal(durationMs, context.state.signal);
      return context.data as DATA;
    },
  } satisfies WorkflowStepSleep<INPUT, DATA>;
}

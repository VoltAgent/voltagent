import type { WorkflowExecuteContext } from "../internal/types";
import { defaultStepConfig } from "../internal/utils";
import { waitWithSignal } from "./signal";
import type { WorkflowStepSleepUntil, WorkflowStepSleepUntilConfig } from "./types";

/**
 * Creates a sleep-until step for the workflow
 *
 * @example
 * ```ts
 * const w = createWorkflow(
 *   andSleepUntil({ id: "pause-until", date: new Date(Date.now() + 1000) }),
 *   andThen({ id: "next", execute: async ({ data }) => ({ ...data }) })
 * );
 * ```
 */
export function andSleepUntil<INPUT, DATA>({
  date,
  ...config
}: WorkflowStepSleepUntilConfig<INPUT, DATA>) {
  return {
    ...defaultStepConfig(config),
    type: "sleep-until",
    date,
    execute: async (context: WorkflowExecuteContext<INPUT, DATA, any, any>) => {
      const target = typeof date === "function" ? await date(context) : date;

      if (!(target instanceof Date) || Number.isNaN(target.getTime())) {
        throw new Error("andSleepUntil expected a valid Date");
      }

      const delayMs = target.getTime() - Date.now();
      await waitWithSignal(delayMs, context.state.signal);
      return context.data as DATA;
    },
  } satisfies WorkflowStepSleepUntil<INPUT, DATA>;
}

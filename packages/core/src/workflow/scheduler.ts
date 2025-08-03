import * as cron from "node-cron";
import { LoggerProxy } from "../logger";
import type { WorkflowScheduleOptions } from "./types";

type CreateSchedulerParams = WorkflowScheduleOptions & { callback: () => Promise<any> };

export const createScheduler = ({
  expression,
  callback,
  onResult,
  options,
}: CreateSchedulerParams) => {
  return cron.schedule(
    expression,
    async (ctx) => {
      const logger = new LoggerProxy({
        component: "scheduler",
      });
      const runLogger = logger.child({});
      runLogger.info(`Next run: ${ctx.task?.getNextRun()}`);

      const result = await callback();
      onResult?.(result);
    },
    {
      ...options,
      noOverlap: true,
    },
  );
};

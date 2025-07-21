import type { Logger } from "@voltagent/internal";
import type { WorkflowLoggerContext, WorkflowLoggerOptions } from "./types";

/**
 * Create a logger instance for workflow operations
 */
export function createWorkflowLogger(
  parentLogger: Logger,
  context: WorkflowLoggerContext,
  options?: WorkflowLoggerOptions,
): Logger {
  const logger = options?.logger || parentLogger;

  // Create child logger with workflow context
  return logger.child({
    component: `Workflow:${context.workflowName || context.workflowId}`,
    ...context,
    ...(options?.context || {}),
  });
}

/**
 * Log workflow lifecycle events
 */
export function logWorkflowEvent(
  logger: Logger,
  event: "start" | "complete" | "error" | "suspend" | "resume" | "step_start" | "step_complete",
  data?: Record<string, any>,
): void {
  const logData = {
    event: `workflow_${event}`,
    ...data,
  };

  switch (event) {
    case "error":
      logger.error(logData, `Workflow error: ${data?.error?.message || "Unknown error"}`);
      break;
    case "start":
      logger.info(logData, "Workflow started");
      break;
    case "complete":
      logger.info(logData, "Workflow completed");
      break;
    case "suspend":
      logger.info(logData, "Workflow suspended");
      break;
    case "resume":
      logger.info(logData, "Workflow resumed");
      break;
    case "step_start":
      logger.debug(logData, `Workflow step started: ${data?.stepType}`);
      break;
    case "step_complete":
      logger.debug(logData, `Workflow step completed: ${data?.stepType}`);
      break;
  }
}

/**
 * Log workflow state changes
 */
export function logWorkflowStateChange(
  logger: Logger,
  fromStatus: string,
  toStatus: string,
  data?: Record<string, any>,
): void {
  logger.debug(
    {
      event: "workflow_state_change",
      fromStatus,
      toStatus,
      ...data,
    },
    `Workflow state changed: ${fromStatus} -> ${toStatus}`,
  );
}

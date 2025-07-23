import type { Logger } from "@voltagent/internal";
import type { WorkflowLoggerContext, WorkflowLoggerOptions } from "./types";
import { buildWorkflowLogMessage, ActionType } from "./message-builder";

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
    component: `Workflow:${context.workflowId}`,
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

  const workflowName = data?.workflowId || "unknown";

  switch (event) {
    case "error":
      logger.error(
        logData,
        buildWorkflowLogMessage(
          workflowName,
          ActionType.ERROR,
          data?.error?.message || "Unknown error",
        ),
      );
      break;
    case "start":
      logger.info(
        logData,
        buildWorkflowLogMessage(workflowName, ActionType.START, "Beginning execution"),
      );
      break;
    case "complete":
      logger.info(
        logData,
        buildWorkflowLogMessage(workflowName, ActionType.COMPLETE, "Finished execution"),
      );
      break;
    case "suspend":
      logger.info(
        logData,
        buildWorkflowLogMessage(workflowName, ActionType.SUSPEND, "Execution suspended"),
      );
      break;
    case "resume":
      logger.info(
        logData,
        buildWorkflowLogMessage(workflowName, ActionType.RESUME, "Execution resumed"),
      );
      break;
    case "step_start":
      logger.debug(
        logData,
        buildWorkflowLogMessage(
          workflowName,
          ActionType.STEP_START,
          `Executing ${data?.stepType} step`,
        ),
      );
      break;
    case "step_complete":
      logger.debug(
        logData,
        buildWorkflowLogMessage(
          workflowName,
          ActionType.STEP_COMPLETE,
          `Completed ${data?.stepType} step`,
        ),
      );
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

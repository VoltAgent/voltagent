import type { ServerProviderDeps } from "@voltagent/core";
import { zodSchemaToJsonUI } from "@voltagent/core";
import { type Logger, safeStringify } from "@voltagent/internal";
import type { ApiResponse, ErrorResponse } from "../types";
import { processWorkflowOptions } from "../utils/options";

/**
 * Handler for listing all workflows
 * Returns workflow list data
 */
export async function handleGetWorkflows(
  deps: ServerProviderDeps,
  logger: Logger,
): Promise<ApiResponse> {
  try {
    const workflows = deps.workflowRegistry.getWorkflowsForApi();
    return {
      success: true,
      data: workflows,
    };
  } catch (error) {
    logger.error("Failed to get workflows", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handler for getting a single workflow
 * Returns workflow detail data with inferred schemas
 */
export async function handleGetWorkflow(
  workflowId: string,
  deps: ServerProviderDeps,
  logger: Logger,
): Promise<ApiResponse> {
  try {
    const workflowData = deps.workflowRegistry.getWorkflowDetailForApi(workflowId);

    if (!workflowData) {
      return {
        success: false,
        error: `Workflow with id ${workflowId} not found`,
      };
    }

    // Get the registered workflow to access schemas
    const registeredWorkflow = deps.workflowRegistry.getWorkflow(workflowId);
    let inputSchema: unknown = null;
    let suspendSchema: unknown = null;
    let resumeSchema: unknown = null;

    if (registeredWorkflow?.inputSchema) {
      try {
        // Convert Zod schema to JSON schema using zodSchemaToJsonUI
        inputSchema = zodSchemaToJsonUI(registeredWorkflow.inputSchema);
      } catch (error) {
        logger.warn("Failed to convert input schema to JSON schema:", { error });
      }
    }

    if (registeredWorkflow?.suspendSchema) {
      try {
        suspendSchema = zodSchemaToJsonUI(registeredWorkflow.suspendSchema);
      } catch (error) {
        logger.warn("Failed to convert suspend schema to JSON schema:", { error });
      }
    }

    if (registeredWorkflow?.resumeSchema) {
      try {
        resumeSchema = zodSchemaToJsonUI(registeredWorkflow.resumeSchema);
      } catch (error) {
        logger.warn("Failed to convert resume schema to JSON schema:", { error });
      }
    }

    // Type guard to check if workflowData has steps array
    const hasSteps = (data: unknown): data is { steps: unknown[] } => {
      return (
        typeof data === "object" &&
        data !== null &&
        "steps" in data &&
        Array.isArray((data as Record<string, unknown>).steps)
      );
    };

    // Convert step-level schemas to JSON format
    if (hasSteps(workflowData)) {
      workflowData.steps = workflowData.steps.map((step) => {
        // Type guard for step with schemas
        const isStepWithSchemas = (s: unknown): s is Record<string, unknown> => {
          return typeof s === "object" && s !== null;
        };

        if (!isStepWithSchemas(step)) {
          return step;
        }

        const convertedStep = { ...step };

        // Convert step schemas if they exist
        if ("inputSchema" in step && step.inputSchema) {
          try {
            convertedStep.inputSchema = zodSchemaToJsonUI(step.inputSchema);
          } catch (error) {
            logger.warn("Failed to convert input schema for step:", { error });
          }
        }

        if ("outputSchema" in step && step.outputSchema) {
          try {
            convertedStep.outputSchema = zodSchemaToJsonUI(step.outputSchema);
          } catch (error) {
            logger.warn("Failed to convert output schema for step:", { error });
          }
        }

        if ("suspendSchema" in step && step.suspendSchema) {
          try {
            convertedStep.suspendSchema = zodSchemaToJsonUI(step.suspendSchema);
          } catch (error) {
            logger.warn("Failed to convert suspend schema for step:", { error });
          }
        }

        if ("resumeSchema" in step && step.resumeSchema) {
          try {
            convertedStep.resumeSchema = zodSchemaToJsonUI(step.resumeSchema);
          } catch (error) {
            logger.warn("Failed to convert resume schema for step:", { error });
          }
        }

        return convertedStep;
      });
    }

    return {
      success: true,
      data: {
        ...workflowData,
        inputSchema,
        suspendSchema,
        resumeSchema,
      },
    };
  } catch (error) {
    logger.error("Failed to get workflow", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handler for executing a workflow
 * Returns workflow execution result
 */
export async function handleExecuteWorkflow(
  workflowId: string,
  body: any,
  deps: ServerProviderDeps,
  logger: Logger,
): Promise<ApiResponse> {
  try {
    const { input, options } = body;

    const registeredWorkflow = deps.workflowRegistry.getWorkflow(workflowId);

    if (!registeredWorkflow) {
      return {
        success: false,
        error: "Workflow not found",
      };
    }

    // Create suspension controller
    const suspendController = registeredWorkflow.workflow.createSuspendController?.();
    if (!suspendController) {
      throw new Error("Workflow does not support suspension");
    }

    const processedOptions = processWorkflowOptions(options, suspendController);
    processedOptions.signal = suspendController.signal;

    // Track execution for suspension
    let capturedExecutionId: string | null = null;
    const historyCreatedHandler = (historyEntry: any) => {
      if (historyEntry.workflowId === workflowId && !capturedExecutionId) {
        capturedExecutionId = historyEntry.id;
        if (deps.workflowRegistry.activeExecutions) {
          deps.workflowRegistry.activeExecutions.set(historyEntry.id, suspendController);
        }
        logger.trace(`Captured execution ${historyEntry.id} for suspension tracking`);
      }
    };

    deps.workflowRegistry.on("historyCreated", historyCreatedHandler);

    try {
      const result = await registeredWorkflow.workflow.run(input, processedOptions);

      deps.workflowRegistry.off("historyCreated", historyCreatedHandler);

      // Clean up active execution
      if (deps.workflowRegistry.activeExecutions) {
        deps.workflowRegistry.activeExecutions.delete(result.executionId);
      }

      return {
        success: true,
        data: {
          executionId: result.executionId,
          startAt: result.startAt instanceof Date ? result.startAt.toISOString() : result.startAt,
          endAt: result.endAt instanceof Date ? result.endAt.toISOString() : result.endAt,
          status: "completed",
          result: result.result,
        },
      };
    } catch (error) {
      deps.workflowRegistry.off("historyCreated", historyCreatedHandler);

      if (capturedExecutionId && deps.workflowRegistry.activeExecutions) {
        deps.workflowRegistry.activeExecutions.delete(capturedExecutionId);
      }

      throw error;
    }
  } catch (error) {
    logger.error("Failed to execute workflow", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to execute workflow",
    };
  }
}

/**
 * Handler for streaming workflow execution
 * Returns a ReadableStream for SSE
 */
export async function handleStreamWorkflow(
  workflowId: string,
  body: any,
  deps: ServerProviderDeps,
  logger: Logger,
): Promise<ReadableStream | ErrorResponse> {
  try {
    const { input, options } = body;

    const registeredWorkflow = deps.workflowRegistry.getWorkflow(workflowId);

    if (!registeredWorkflow) {
      return {
        success: false,
        error: "Workflow not found",
      };
    }

    // Create suspension controller
    const suspendController = registeredWorkflow.workflow.createSuspendController?.();
    if (!suspendController) {
      throw new Error("Workflow does not support suspension");
    }

    const processedOptions = processWorkflowOptions(options, suspendController);

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          const workflowStream = registeredWorkflow.workflow.stream(input, processedOptions);
          const executionId = workflowStream.executionId;

          // Track as active execution
          if (executionId && deps.workflowRegistry.activeExecutions) {
            deps.workflowRegistry.activeExecutions.set(executionId, suspendController);
          }

          // Stream events to client
          for await (const event of workflowStream) {
            const sseEvent = `data: ${safeStringify(event)}\n\n`;
            controller.enqueue(encoder.encode(sseEvent));
          }

          // Send final result
          const result = await workflowStream.result;
          const status = await workflowStream.status;
          const endAt = await workflowStream.endAt;

          const finalEvent = {
            type: "workflow-result",
            executionId,
            status,
            result,
            endAt: endAt instanceof Date ? endAt.toISOString() : endAt,
          };

          const sseFinalEvent = `data: ${safeStringify(finalEvent)}\n\n`;
          controller.enqueue(encoder.encode(sseFinalEvent));

          // Clean up active execution
          if (executionId && deps.workflowRegistry.activeExecutions) {
            deps.workflowRegistry.activeExecutions.delete(executionId);
          }

          controller.close();
        } catch (error) {
          logger.error("Failed during workflow stream:", { error });
          const errorEvent = {
            type: "error",
            error: error instanceof Error ? error.message : "Stream failed",
          };
          const sseError = `data: ${safeStringify(errorEvent)}\n\n`;
          controller.enqueue(encoder.encode(sseError));
          controller.close();
        }
      },
    });

    return stream;
  } catch (error) {
    logger.error("Failed to initiate workflow stream", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to initiate workflow stream",
    };
  }
}

/**
 * Handler for suspending a workflow
 * Returns suspension result
 */
export async function handleSuspendWorkflow(
  executionId: string,
  body: any,
  deps: ServerProviderDeps,
  logger: Logger,
): Promise<ApiResponse> {
  try {
    const { reason } = body || {};

    if (!deps.workflowRegistry.activeExecutions) {
      return {
        success: false,
        error: "Workflow suspension not supported",
      };
    }

    const suspendController = deps.workflowRegistry.activeExecutions.get(executionId);

    if (!suspendController) {
      return {
        success: false,
        error: "Workflow execution not found or already completed",
      };
    }

    // Trigger suspension
    suspendController.suspend(reason || "API request");

    // Remove from active executions
    deps.workflowRegistry.activeExecutions.delete(executionId);

    // Wait for suspension to propagate
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      success: true,
      data: {
        executionId,
        status: "suspended",
        suspension: {
          suspendedAt: new Date().toISOString(),
          reason: reason || "API request",
        },
      },
    };
  } catch (error) {
    logger.error("Failed to suspend workflow", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to suspend workflow",
    };
  }
}

/**
 * Handler for cancelling a workflow
 * Returns cancellation result
 */
export async function handleCancelWorkflow(
  executionId: string,
  body: any,
  deps: ServerProviderDeps,
  logger: Logger,
): Promise<ApiResponse> {
  try {
    const { reason } = body || {};

    if (!deps.workflowRegistry.activeExecutions) {
      return {
        success: false,
        error: "Workflow cancellation not supported",
      };
    }

    const suspendController = deps.workflowRegistry.activeExecutions.get(executionId);

    if (!suspendController) {
      return {
        success: false,
        error: "No active execution found or workflow already completed",
      };
    }

    if (suspendController.isCancelled?.()) {
      return {
        success: true,
        data: {
          executionId,
          status: "cancelled" as const,
          cancelledAt: new Date().toISOString(),
          reason: suspendController.getCancelReason?.(),
        },
      };
    }

    const cancellationReason = reason || "API request";

    suspendController.cancel(cancellationReason);

    // Remove from active executions immediately to prevent duplicate cancellations
    deps.workflowRegistry.activeExecutions.delete(executionId);

    // Wait a moment to allow cancellation to propagate
    await new Promise((resolve) => setTimeout(resolve, 50));

    return {
      success: true,
      data: {
        executionId,
        status: "cancelled" as const,
        cancelledAt: new Date().toISOString(),
        reason: cancellationReason,
      },
    };
  } catch (error) {
    logger.error("Failed to cancel workflow", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel workflow",
    };
  }
}

/**
 * Handler for resuming a workflow
 * Returns resume result
 */
export async function handleResumeWorkflow(
  workflowId: string,
  executionId: string,
  body: any,
  deps: ServerProviderDeps,
  logger: Logger,
): Promise<ApiResponse> {
  try {
    const { resumeData, options } = body || {};

    // Use the registry to resume the workflow
    const result = await deps.workflowRegistry.resumeSuspendedWorkflow(
      workflowId,
      executionId,
      resumeData,
      options?.stepId,
    );

    if (!result) {
      return {
        success: false,
        error: "Failed to resume workflow - execution not found or not suspended",
      };
    }

    return {
      success: true,
      data: {
        executionId: result.executionId,
        startAt: result.startAt instanceof Date ? result.startAt.toISOString() : result.startAt,
        endAt: result.endAt instanceof Date ? result.endAt.toISOString() : result.endAt,
        status: result.status,
        result: result.result,
      },
    };
  } catch (error) {
    logger.error("Failed to resume workflow", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to resume workflow",
    };
  }
}

/**
 * Handler for getting workflow execution state
 * Returns workflow state from Memory V2
 */
export async function handleGetWorkflowState(
  workflowId: string,
  executionId: string,
  deps: ServerProviderDeps,
  logger: Logger,
): Promise<ApiResponse> {
  try {
    // Get the registered workflow
    const registeredWorkflow = deps.workflowRegistry.getWorkflow(workflowId);

    if (!registeredWorkflow) {
      return {
        success: false,
        error: `Workflow with id ${workflowId} not found`,
      };
    }

    // Get the workflow state from Memory
    const workflowState = await registeredWorkflow.workflow.memory.getWorkflowState(executionId);

    if (!workflowState) {
      return {
        success: false,
        error: `Workflow execution state for ${executionId} not found`,
      };
    }

    // Format dates for JSON response
    const formattedState = {
      ...workflowState,
      createdAt:
        workflowState.createdAt instanceof Date
          ? workflowState.createdAt.toISOString()
          : workflowState.createdAt,
      updatedAt:
        workflowState.updatedAt instanceof Date
          ? workflowState.updatedAt.toISOString()
          : workflowState.updatedAt,
      suspension: workflowState.suspension
        ? {
            ...workflowState.suspension,
            suspendedAt:
              workflowState.suspension.suspendedAt instanceof Date
                ? workflowState.suspension.suspendedAt.toISOString()
                : workflowState.suspension.suspendedAt,
          }
        : undefined,
    };

    return {
      success: true,
      data: formattedState,
    };
  } catch (error) {
    logger.error("Failed to get workflow state", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get workflow state",
    };
  }
}

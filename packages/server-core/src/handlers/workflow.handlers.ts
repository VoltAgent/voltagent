import type { ServerProviderDeps, WorkflowRunQuery, WorkflowStateEntry } from "@voltagent/core";
import { zodSchemaToJsonUI } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import type { ApiResponse, ErrorResponse } from "../types";
import { processWorkflowOptions } from "../utils/options";
import { formatSSE } from "../utils/sse";

const MAX_STREAM_REPLAY_HISTORY = 500;

type StreamQueryValue = string | number | null | undefined;

type SSEEncoder = {
  encode: (input?: string) => Uint8Array;
};

type WorkflowStreamSubscriber = {
  controller: ReadableStreamDefaultController<Uint8Array>;
  encoder: SSEEncoder;
};

type WorkflowStreamReplayEntry = {
  sequence: number;
  payload: unknown;
};

type WorkflowStreamSession = {
  workflowId: string;
  executionId: string;
  subscribers: Set<WorkflowStreamSubscriber>;
  replayBuffer: WorkflowStreamReplayEntry[];
  nextSequence: number;
  isClosed: boolean;
  streamExecution: ResumableStreamingWorkflowExecution;
};

const activeWorkflowStreamSessions = new Map<string, WorkflowStreamSession>();

type StreamingWorkflowExecution = AsyncIterable<unknown> & {
  executionId: string;
  workflowId?: string;
  startAt?: Date;
  result: Promise<unknown>;
  status: Promise<string>;
  endAt: Promise<Date | string>;
};

type ResumableStreamingWorkflowExecution = StreamingWorkflowExecution & {
  resume?: (
    input: unknown,
    options?: {
      stepId?: string;
    },
  ) => Promise<ResumableStreamingWorkflowExecution>;
};

function parseReplaySequence(value: StreamQueryValue): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }

  return Math.floor(parsed);
}

function createWorkflowStreamSession(
  workflowId: string,
  executionId: string,
  streamExecution: ResumableStreamingWorkflowExecution,
): WorkflowStreamSession {
  return {
    workflowId,
    executionId,
    subscribers: new Set(),
    replayBuffer: [],
    nextSequence: 1,
    isClosed: false,
    streamExecution,
  };
}

function unregisterWorkflowStreamSession(session: WorkflowStreamSession): void {
  activeWorkflowStreamSessions.delete(session.executionId);
}

function closeWorkflowStreamSession(session: WorkflowStreamSession): void {
  if (session.isClosed) {
    return;
  }

  session.isClosed = true;

  for (const subscriber of session.subscribers) {
    try {
      subscriber.controller.close();
    } catch {
      // no-op: stream may already be closed
    }
  }

  session.subscribers.clear();
  unregisterWorkflowStreamSession(session);
}

function enqueueSSEMessage(
  subscriber: WorkflowStreamSubscriber,
  payload: unknown,
  sequence: number,
): void {
  const ssePayload = formatSSE(payload, undefined, String(sequence));
  subscriber.controller.enqueue(subscriber.encoder.encode(ssePayload));
}

function appendReplayEvent(
  session: WorkflowStreamSession,
  payload: unknown,
  sequence: number,
): void {
  session.replayBuffer.push({ sequence, payload });

  if (session.replayBuffer.length > MAX_STREAM_REPLAY_HISTORY) {
    session.replayBuffer.splice(0, session.replayBuffer.length - MAX_STREAM_REPLAY_HISTORY);
  }
}

function broadcastWorkflowStreamEvent(session: WorkflowStreamSession, payload: unknown): void {
  if (session.isClosed) {
    return;
  }

  const sequence = session.nextSequence;
  session.nextSequence += 1;
  appendReplayEvent(session, payload, sequence);

  for (const subscriber of session.subscribers) {
    try {
      enqueueSSEMessage(subscriber, payload, sequence);
    } catch {
      session.subscribers.delete(subscriber);
    }
  }
}

function createWorkflowSessionStream(
  session: WorkflowStreamSession,
  options?: {
    fromSequence?: number;
  },
): ReadableStream {
  let subscriber: WorkflowStreamSubscriber | undefined;
  const replayFrom = options?.fromSequence;

  return new ReadableStream({
    start(controller) {
      subscriber = {
        controller,
        encoder: new TextEncoder(),
      };

      if (replayFrom !== undefined) {
        for (const replayEntry of session.replayBuffer) {
          if (replayEntry.sequence > replayFrom) {
            enqueueSSEMessage(subscriber, replayEntry.payload, replayEntry.sequence);
          }
        }
      }

      if (session.isClosed) {
        controller.close();
        return;
      }

      session.subscribers.add(subscriber);
    },
    cancel() {
      if (!subscriber) {
        return;
      }

      session.subscribers.delete(subscriber);
    },
  });
}

async function consumeWorkflowStream(
  session: WorkflowStreamSession,
  deps: ServerProviderDeps,
  logger: Logger,
): Promise<void> {
  try {
    // Iterate over the original stream source. Resume operations continue on the same underlying
    // stream controller, while `session.streamExecution` is updated to reflect latest promises.
    for await (const event of session.streamExecution) {
      broadcastWorkflowStreamEvent(session, event);
    }

    const terminalExecution = session.streamExecution;
    const result = await terminalExecution.result;
    const status = await terminalExecution.status;
    const endAt = await terminalExecution.endAt;

    const finalEvent = {
      type: "workflow-result",
      executionId: terminalExecution.executionId,
      status,
      result,
      endAt: endAt instanceof Date ? endAt.toISOString() : endAt,
    };

    broadcastWorkflowStreamEvent(session, finalEvent);

    if (deps.workflowRegistry.activeExecutions) {
      deps.workflowRegistry.activeExecutions.delete(terminalExecution.executionId);
    }

    closeWorkflowStreamSession(session);
  } catch (error) {
    logger.error("Failed during workflow stream:", { error });

    if (deps.workflowRegistry.activeExecutions) {
      deps.workflowRegistry.activeExecutions.delete(session.executionId);
    }

    broadcastWorkflowStreamEvent(session, {
      type: "error",
      error: error instanceof Error ? error.message : "Stream failed",
    });

    closeWorkflowStreamSession(session);
  }
}

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
    let resultSchema: unknown = null;
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

    if (registeredWorkflow?.resultSchema) {
      try {
        resultSchema = zodSchemaToJsonUI(registeredWorkflow.resultSchema);
      } catch (error) {
        logger.warn("Failed to convert result schema to JSON schema:", { error });
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
        resultSchema,
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
    const workflowStream = registeredWorkflow.workflow.stream(
      input,
      processedOptions,
    ) as ResumableStreamingWorkflowExecution;
    const executionId = workflowStream.executionId;

    if (!executionId) {
      throw new Error("Workflow stream executionId is required");
    }

    // Track as active execution for suspend/cancel operations.
    if (deps.workflowRegistry.activeExecutions) {
      deps.workflowRegistry.activeExecutions.set(executionId, suspendController);
    }

    const existingSession = activeWorkflowStreamSessions.get(executionId);
    if (existingSession) {
      closeWorkflowStreamSession(existingSession);
    }

    const session = createWorkflowStreamSession(workflowId, executionId, workflowStream);
    activeWorkflowStreamSessions.set(executionId, session);

    consumeWorkflowStream(session, deps, logger).catch((error) => {
      logger.error("Unhandled workflow stream consumer error", { error });
    });

    return createWorkflowSessionStream(session);
  } catch (error) {
    logger.error("Failed to initiate workflow stream", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to initiate workflow stream",
    };
  }
}

/**
 * Handler for attaching to an existing workflow execution stream
 * Returns a ReadableStream for SSE
 */
export async function handleAttachWorkflowStream(
  workflowId: string,
  executionId: string,
  query: {
    fromSequence?: string | number;
    lastEventId?: string | null;
  },
  deps: ServerProviderDeps,
  logger: Logger,
): Promise<ReadableStream | ErrorResponse> {
  try {
    const registeredWorkflow = deps.workflowRegistry.getWorkflow(workflowId);

    if (!registeredWorkflow) {
      return {
        success: false,
        error: "Workflow not found",
        httpStatus: 404,
      };
    }

    const activeSession = activeWorkflowStreamSessions.get(executionId);
    if (activeSession && activeSession.workflowId === workflowId) {
      const replayFromSequence =
        parseReplaySequence(query.fromSequence) ?? parseReplaySequence(query.lastEventId);

      return createWorkflowSessionStream(activeSession, {
        fromSequence: replayFromSequence,
      });
    }

    const workflowState = await registeredWorkflow.workflow.memory.getWorkflowState(executionId);
    if (!workflowState || workflowState.workflowId !== workflowId) {
      return {
        success: false,
        error: "Workflow execution not found",
        httpStatus: 404,
      };
    }

    if (workflowState.status === "completed" || workflowState.status === "cancelled") {
      return {
        success: false,
        error: `Workflow execution is not streamable in '${workflowState.status}' status`,
        httpStatus: 409,
      };
    }

    if (workflowState.status === "error") {
      return {
        success: false,
        error: "Workflow execution is not streamable in 'error' status",
        httpStatus: 409,
      };
    }

    return {
      success: false,
      error: "Workflow execution has no active stream context to attach",
      httpStatus: 409,
    };
  } catch (error) {
    logger.error("Failed to attach to workflow stream", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to attach to workflow stream",
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

    const activeSession = activeWorkflowStreamSessions.get(executionId);
    if (
      activeSession &&
      activeSession.workflowId === workflowId &&
      typeof activeSession.streamExecution.resume === "function"
    ) {
      const resumedStreamExecution = await activeSession.streamExecution.resume(
        resumeData,
        options?.stepId ? { stepId: options.stepId } : undefined,
      );
      activeSession.streamExecution = resumedStreamExecution;

      const status = await resumedStreamExecution.status;
      const result = await resumedStreamExecution.result;
      const endAt = await resumedStreamExecution.endAt;

      return {
        success: true,
        data: {
          executionId: resumedStreamExecution.executionId,
          startAt:
            resumedStreamExecution.startAt instanceof Date
              ? resumedStreamExecution.startAt.toISOString()
              : resumedStreamExecution.startAt,
          endAt: endAt instanceof Date ? endAt.toISOString() : endAt,
          status,
          result,
        },
      };
    }

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

function formatWorkflowState(workflowState: WorkflowStateEntry) {
  return {
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
}

type WorkflowRunsQuery = {
  status?: string | number;
  from?: string | number;
  to?: string | number;
  limit?: string | number;
  offset?: string | number;
  workflowId?: string | number;
  userId?: string | number;
  metadata?: string;
} & Record<string, string | number | undefined>;

const WORKFLOW_RUN_STATUSES = new Set<WorkflowStateEntry["status"]>([
  "running",
  "suspended",
  "completed",
  "cancelled",
  "error",
]);

const WORKFLOW_RUN_STATUS_ALIASES: Partial<Record<string, WorkflowStateEntry["status"]>> = {
  success: "completed",
  pending: "running",
};

function normalizeWorkflowRunStatus(value: string | number | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = String(value).trim().toLowerCase();
  const resolved = WORKFLOW_RUN_STATUS_ALIASES[normalized] ?? normalized;

  if (WORKFLOW_RUN_STATUSES.has(resolved as WorkflowStateEntry["status"])) {
    return resolved as WorkflowStateEntry["status"];
  }

  return undefined;
}

function parseQueryNumber(value: string | number | undefined, options?: { min?: number }) {
  if (value === undefined) {
    return undefined;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  if (options?.min !== undefined && parsed < options.min) {
    return undefined;
  }

  return parsed;
}

function parseQueryDate(value: string | number | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

function parseMetadataFilterValue(value: string | number) {
  if (typeof value === "number") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function parseMetadataFilters(query: WorkflowRunsQuery | undefined, logger: Logger) {
  const metadataFilters: Record<string, unknown> = {};

  const rawMetadata = query?.metadata;
  if (typeof rawMetadata === "string") {
    try {
      const parsed = JSON.parse(rawMetadata);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        Object.assign(metadataFilters, parsed as Record<string, unknown>);
      }
    } catch (error) {
      logger.warn("Ignoring invalid workflow metadata filter payload", {
        metadata: rawMetadata,
        error,
      });
    }
  }

  for (const [key, value] of Object.entries(query ?? {})) {
    if (!key.startsWith("metadata.") || value === undefined) {
      continue;
    }

    const metadataKey = key.slice("metadata.".length).trim();
    if (!metadataKey) {
      continue;
    }

    metadataFilters[metadataKey] = parseMetadataFilterValue(value);
  }

  return Object.keys(metadataFilters).length > 0 ? metadataFilters : undefined;
}

/**
 * Handler for listing workflow execution runs
 */
export async function handleListWorkflowRuns(
  workflowId: string | undefined,
  query: WorkflowRunsQuery | undefined,
  deps: ServerProviderDeps,
  logger: Logger,
): Promise<ApiResponse> {
  try {
    const effectiveWorkflowId =
      query?.workflowId !== undefined ? String(query.workflowId) : workflowId;
    const metadataFilters = parseMetadataFilters(query, logger);

    const filters: WorkflowRunQuery = {
      workflowId: effectiveWorkflowId,
      status: normalizeWorkflowRunStatus(query?.status),
      limit: parseQueryNumber(query?.limit, { min: 1 }),
      offset: parseQueryNumber(query?.offset, { min: 0 }),
      userId: query?.userId !== undefined ? String(query.userId) : undefined,
      metadata: metadataFilters,
    };

    filters.from = parseQueryDate(query?.from);
    filters.to = parseQueryDate(query?.to);

    if (effectiveWorkflowId) {
      const registeredWorkflow = deps.workflowRegistry.getWorkflow(effectiveWorkflowId);

      if (!registeredWorkflow) {
        return {
          success: false,
          error: `Workflow with id ${effectiveWorkflowId} not found`,
        };
      }

      const workflowStates = await registeredWorkflow.workflow.memory.queryWorkflowRuns(filters);
      const formattedStates = workflowStates.map((state) => formatWorkflowState(state));

      return {
        success: true,
        data: formattedStates,
      };
    }

    // No workflowId provided: aggregate across all registered workflows
    const allWorkflowIds = deps.workflowRegistry.getAllWorkflowIds?.() ?? [];
    const results: WorkflowStateEntry[] = [];

    for (const id of allWorkflowIds) {
      const registeredWorkflow = deps.workflowRegistry.getWorkflow(id);
      if (!registeredWorkflow) continue;
      const states = await registeredWorkflow.workflow.memory.queryWorkflowRuns({
        ...filters,
        workflowId: id,
      });
      results.push(...states);
    }

    const formattedStates = results
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((state) => formatWorkflowState(state));

    return {
      success: true,
      data: formattedStates,
    };
  } catch (error) {
    logger.error("Failed to get workflow states", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get workflow states",
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
    const formattedState = formatWorkflowState(workflowState);

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

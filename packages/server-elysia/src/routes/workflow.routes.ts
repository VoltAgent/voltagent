import type { ServerProviderDeps } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import {
  handleCancelWorkflow,
  handleExecuteWorkflow,
  handleGetWorkflow,
  handleGetWorkflowState,
  handleGetWorkflows,
  handleListWorkflowRuns,
  handleResumeWorkflow,
  handleStreamWorkflow,
  handleSuspendWorkflow,
  isErrorResponse,
} from "@voltagent/server-core";
import type { Elysia } from "elysia";
import { t } from "elysia";
import {
  ErrorSchema,
  WorkflowCancelRequestSchema,
  WorkflowCancelResponseSchema,
  WorkflowExecutionRequestSchema,
  WorkflowExecutionResponseSchema,
  WorkflowListSchema,
  WorkflowResponseSchema,
  WorkflowResumeRequestSchema,
  WorkflowResumeResponseSchema,
  WorkflowSuspendRequestSchema,
  WorkflowSuspendResponseSchema,
} from "../schemas";

/**
 * Workflow list query parameters schema
 */
const WorkflowListQuerySchema = t.Object(
  {
    workflowId: t.Optional(t.String({ description: "Filter by workflow ID" })),
    status: t.Optional(
      t.Union(
        [
          t.Literal("pending"),
          t.Literal("running"),
          t.Literal("success"),
          t.Literal("completed"),
          t.Literal("error"),
          t.Literal("suspended"),
          t.Literal("cancelled"),
        ],
        { description: "Filter by execution status" },
      ),
    ),
    from: t.Optional(
      t.String({ description: "Filter runs created at or after this ISO timestamp" }),
    ),
    to: t.Optional(
      t.String({ description: "Filter runs created at or before this ISO timestamp" }),
    ),
    userId: t.Optional(t.String({ description: "Filter by user ID" })),
    metadata: t.Optional(
      t.String({
        description:
          'Filter by metadata as a JSON object string (e.g. {"tenantId":"acme"}). You can also use query keys prefixed with metadata., such as metadata.tenantId=acme.',
      }),
    ),
    limit: t.Optional(
      t.Number({
        minimum: 1,
        maximum: 100,
        description: "Maximum number of executions to return",
      }),
    ),
    offset: t.Optional(t.Number({ minimum: 0, description: "Number of executions to skip" })),
  },
  // Required for query params like metadata.tenantId=acme (dot-notation metadata filters).
  { additionalProperties: true },
);

/**
 * Workflow ID parameter schema
 */
const WorkflowIdParam = t.Object({
  id: t.String({ description: "Workflow ID" }),
});

/**
 * Workflow and execution ID parameters schema
 */
const WorkflowExecutionParams = t.Object({
  id: t.String({ description: "Workflow ID" }),
  executionId: t.String({ description: "Workflow execution ID" }),
});

/**
 * Register workflow routes with validation and OpenAPI documentation
 */
export function registerWorkflowRoutes(
  app: Elysia,
  deps: ServerProviderDeps,
  logger: Logger,
): void {
  // GET /workflows - List all workflows
  app.get(
    "/workflows",
    async () => {
      const response = await handleGetWorkflows(deps, logger);
      if (!response.success) {
        throw new Error("Failed to get workflows");
      }
      return response;
    },
    {
      response: {
        200: t.Object({
          success: t.Literal(true),
          data: WorkflowListSchema,
        }),
        500: ErrorSchema,
      },
      detail: {
        summary: "List all workflows",
        description: "Retrieves a list of all available workflows",
        tags: ["Workflows"],
      },
    },
  );

  // GET /workflows/executions - List workflow executions (query-driven)
  app.get(
    "/workflows/executions",
    async ({ query }) => {
      const response = await handleListWorkflowRuns(undefined, query as any, deps, logger);
      if (!response.success) {
        throw new Error(response.error || "Failed to list workflow runs");
      }
      return response;
    },
    {
      query: WorkflowListQuerySchema,
      detail: {
        summary: "List workflow executions",
        description: "Retrieves a paginated list of workflow executions with optional filters",
        tags: ["Workflows"],
      },
    },
  );

  // GET /workflows/:id - Get workflow by ID
  app.get(
    "/workflows/:id",
    async ({ params }) => {
      const response = await handleGetWorkflow(params.id, deps, logger);
      if (!response.success) {
        throw new Error("Workflow not found");
      }
      return response;
    },
    {
      params: WorkflowIdParam,
      response: {
        200: t.Object({
          success: t.Literal(true),
          data: WorkflowResponseSchema,
        }),
        404: ErrorSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Get workflow by ID",
        description: "Retrieves detailed information about a specific workflow",
        tags: ["Workflows"],
      },
    },
  );

  // POST /workflows/:id/execute - Execute workflow
  app.post(
    "/workflows/:id/execute",
    async ({ params, body }) => {
      const response = await handleExecuteWorkflow(params.id, body, deps, logger);
      if (!response.success) {
        throw new Error("Failed to execute workflow");
      }
      return response;
    },
    {
      params: WorkflowIdParam,
      body: WorkflowExecutionRequestSchema,
      response: {
        200: WorkflowExecutionResponseSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Execute workflow",
        description: "Starts a new workflow execution with the provided input data",
        tags: ["Workflows"],
      },
    },
  );

  // POST /workflows/:id/stream - Stream workflow execution
  app.post(
    "/workflows/:id/stream",
    async ({ params, body, set }) => {
      const response = await handleStreamWorkflow(params.id, body, deps, logger);

      // Check if it's an error response
      if (isErrorResponse(response)) {
        throw new Error("Failed to stream workflow");
      }

      // Return the ReadableStream with proper headers
      set.headers["Content-Type"] = "text/event-stream";
      set.headers["Cache-Control"] = "no-cache";
      set.headers.Connection = "keep-alive";
      return response;
    },
    {
      params: WorkflowIdParam,
      body: WorkflowExecutionRequestSchema,
      detail: {
        summary: "Stream workflow execution",
        description:
          "Executes a workflow and streams execution events in real-time via Server-Sent Events (SSE)",
        tags: ["Workflows"],
      },
    },
  );

  // POST /workflows/:id/executions/:executionId/suspend - Suspend workflow execution
  app.post(
    "/workflows/:id/executions/:executionId/suspend",
    async ({ params, body, set }) => {
      const response = await handleSuspendWorkflow(params.executionId, body, deps, logger);
      if (!response.success) {
        const errorMessage = response.error || "";
        set.status = errorMessage.includes("not found")
          ? 404
          : errorMessage.includes("not supported") || errorMessage.includes("suspendable")
            ? 400
            : 500;
        return response;
      }
      set.status = 200;
      return response;
    },
    {
      params: WorkflowExecutionParams,
      body: WorkflowSuspendRequestSchema,
      response: {
        200: WorkflowSuspendResponseSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Suspend workflow execution",
        description: "Suspends a running workflow execution, allowing it to be resumed later",
        tags: ["Workflows"],
      },
    },
  );

  // POST /workflows/:id/executions/:executionId/cancel - Cancel workflow execution
  app.post(
    "/workflows/:id/executions/:executionId/cancel",
    async ({ params, body, set }) => {
      const response = await handleCancelWorkflow(params.executionId, body, deps, logger);
      if (!response.success) {
        const errorMessage = response.error || "";
        set.status = errorMessage.includes("not found")
          ? 404
          : errorMessage.includes("not cancellable")
            ? 409
            : 500;
        return response;
      }
      set.status = 200;
      return response;
    },
    {
      params: WorkflowExecutionParams,
      body: WorkflowCancelRequestSchema,
      response: {
        200: WorkflowCancelResponseSchema,
        404: ErrorSchema,
        409: ErrorSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Cancel workflow execution",
        description: "Cancels a running or suspended workflow execution permanently",
        tags: ["Workflows"],
      },
    },
  );

  // POST /workflows/:id/executions/:executionId/resume - Resume workflow execution
  app.post(
    "/workflows/:id/executions/:executionId/resume",
    async ({ params, body }) => {
      const response = await handleResumeWorkflow(
        params.id,
        params.executionId,
        body,
        deps,
        logger,
      );
      if (!response.success) {
        throw new Error("Failed to resume workflow");
      }
      return response;
    },
    {
      params: WorkflowExecutionParams,
      body: WorkflowResumeRequestSchema,
      response: {
        200: WorkflowResumeResponseSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Resume workflow execution",
        description: "Resumes a suspended workflow execution, optionally providing resume data",
        tags: ["Workflows"],
      },
    },
  );

  // GET /workflows/:id/executions/:executionId/state - Get workflow execution state
  app.get(
    "/workflows/:id/executions/:executionId/state",
    async ({ params }) => {
      const response = await handleGetWorkflowState(params.id, params.executionId, deps, logger);
      if (!response.success) {
        if (response.error?.includes("not found")) {
          throw new Error("Execution not found");
        }
        throw new Error("Failed to get workflow state");
      }
      return response;
    },
    {
      params: WorkflowExecutionParams,
      response: {
        200: t.Object({
          success: t.Literal(true),
          data: t.Any(), // State can be anything
        }),
        404: ErrorSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Get workflow execution state",
        description:
          "Retrieves the current state of a workflow execution, including status and step information",
        tags: ["Workflows"],
      },
    },
  );
}

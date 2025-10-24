import type { ServerProviderDeps } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import {
  UPDATE_ROUTES,
  handleCancelWorkflow,
  handleChatStream,
  handleCheckUpdates,
  handleExecuteWorkflow,
  handleGenerateObject,
  handleGenerateText,
  handleGetAgent,
  handleGetAgentHistory,
  handleGetAgents,
  handleGetLogs,
  handleGetWorkflow,
  handleGetWorkflowState,
  handleGetWorkflows,
  handleInstallUpdates,
  handleResumeWorkflow,
  handleStreamObject,
  handleStreamText,
  handleStreamWorkflow,
  handleSuspendWorkflow,
  isErrorResponse,
  mapLogResponse,
} from "@voltagent/server-core";
import type { OpenAPIHonoType } from "../zod-openapi-compat";
import {
  cancelWorkflowRoute,
  chatRoute,
  executeWorkflowRoute,
  getAgentsRoute,
  getWorkflowsRoute,
  objectRoute,
  resumeWorkflowRoute,
  streamObjectRoute,
  streamRoute,
  streamWorkflowRoute,
  suspendWorkflowRoute,
  textRoute,
} from "./agent.routes";
import { getLogsRoute } from "./log.routes";
export { registerMcpRoutes } from "./mcp.routes";
export { registerA2ARoutes } from "./a2a.routes";

/**
 * Register agent routes
 */
export function registerAgentRoutes(
  app: OpenAPIHonoType,
  deps: ServerProviderDeps,
  logger: Logger,
) {
  // GET /agents - List all agents
  app.openapi(getAgentsRoute, async (c) => {
    const response = await handleGetAgents(deps, logger);
    if (!response.success) {
      return c.json(response, 500);
    }
    return c.json(response, 200);
  });

  // GET /agents/:id - Get agent by ID
  app.get("/agents/:id", async (c) => {
    const agentId = c.req.param("id");
    if (!agentId) {
      throw new Error("Missing agent id parameter");
    }
    const response = await handleGetAgent(agentId, deps, logger);
    if (!response.success) {
      return c.json(response, 500);
    }
    return c.json(response, 200);
  });

  // POST /agents/:id/text - Generate text (AI SDK compatible)
  app.openapi(textRoute, async (c) => {
    const agentId = c.req.param("id");
    if (!agentId) {
      throw new Error("Missing agent id parameter");
    }
    const body = await c.req.json();

    const signal = c.req.raw.signal;
    const response = await handleGenerateText(agentId, body, deps, logger, signal);
    if (!response.success) {
      const { httpStatus, ...details } = response;
      return c.json(details, httpStatus || 500);
    }
    return c.json(response, 200);
  });

  // POST /agents/:id/stream - Stream text (raw fullStream SSE)
  app.openapi(streamRoute, async (c) => {
    const agentId = c.req.param("id");
    if (!agentId) {
      throw new Error("Missing agent id parameter");
    }
    const body = await c.req.json();
    const signal = c.req.raw.signal;
    const response = await handleStreamText(agentId, body, deps, logger, signal);

    // Handler now always returns a Response object
    return response;
  });

  // POST /agents/:id/chat - Stream chat messages (UI message stream SSE)
  app.openapi(chatRoute, async (c) => {
    const agentId = c.req.param("id");
    if (!agentId) {
      throw new Error("Missing agent id parameter");
    }
    const body = await c.req.json();
    const signal = c.req.raw.signal;
    const response = await handleChatStream(agentId, body, deps, logger, signal);

    // Handler now always returns a Response object
    return response;
  });

  // POST /agents/:id/object - Generate object
  app.openapi(objectRoute, async (c) => {
    const agentId = c.req.param("id");
    if (!agentId) {
      throw new Error("Missing agent id parameter");
    }
    const body = await c.req.json();
    const signal = c.req.raw.signal;
    const response = await handleGenerateObject(agentId, body, deps, logger, signal);
    if (!response.success) {
      const { httpStatus, ...details } = response;
      return c.json(details, httpStatus || 500);
    }
    return c.json(response, 200);
  });

  // POST /agents/:id/stream-object - Stream object
  app.openapi(streamObjectRoute, async (c) => {
    const agentId = c.req.param("id");
    if (!agentId) {
      throw new Error("Missing agent id parameter");
    }
    const body = await c.req.json();
    const signal = c.req.raw.signal;
    const response = await handleStreamObject(agentId, body, deps, logger, signal);

    // Handler now always returns a Response object
    return response;
  });

  // GET /agents/:id/history - Get agent history with pagination
  app.get("/agents/:id/history", async (c) => {
    const agentId = c.req.param("id");
    if (!agentId) {
      return c.json({ success: false, error: "Missing agent id parameter" }, 400);
    }
    const page = Number.parseInt(c.req.query("page") || "0", 10);
    const limit = Number.parseInt(c.req.query("limit") || "10", 10);
    const response = await handleGetAgentHistory(agentId, page, limit, deps, logger);
    if (!response.success) {
      return c.json(response, 500);
    }
    return c.json(response, 200);
  });

  // More agent routes can be added here...
}

/**
 * Register workflow routes
 */
export function registerWorkflowRoutes(
  app: OpenAPIHonoType,
  deps: ServerProviderDeps,
  logger: Logger,
) {
  // GET /workflows - List all workflows
  app.openapi(getWorkflowsRoute, async (c) => {
    const response = await handleGetWorkflows(deps, logger);
    if (!response.success) {
      return c.json(response, 500);
    }
    return c.json(response, 200);
  });

  // GET /workflows/:id - Get workflow by ID
  app.get("/workflows/:id", async (c) => {
    const workflowId = c.req.param("id");
    if (!workflowId) {
      throw new Error("Missing workflow id parameter");
    }
    const response = await handleGetWorkflow(workflowId, deps, logger);
    if (!response.success) {
      return c.json(response, 500);
    }
    return c.json(response, 200);
  });

  // Execute workflow
  app.openapi(executeWorkflowRoute, async (c) => {
    const workflowId = c.req.param("id");
    if (!workflowId) {
      throw new Error("Missing workflow id parameter");
    }
    const body = await c.req.json();
    const response = await handleExecuteWorkflow(workflowId, body, deps, logger);
    if (!response.success) {
      return c.json(response, 500);
    }
    return c.json(response, 200);
  });

  // Stream workflow execution
  app.openapi(streamWorkflowRoute, async (c) => {
    const workflowId = c.req.param("id");
    if (!workflowId) {
      throw new Error("Missing workflow id parameter");
    }
    const body = await c.req.json();
    const response = await handleStreamWorkflow(workflowId, body, deps, logger);

    // Check if it's an error response
    if (isErrorResponse(response)) {
      return c.json(response, 500);
    }

    // It's a ReadableStream for custom SSE
    return c.body(response, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  });

  // Suspend workflow execution
  app.openapi(suspendWorkflowRoute, async (c) => {
    const executionId = c.req.param("executionId");
    if (!executionId) {
      throw new Error("Missing execution id parameter");
    }
    const body = await c.req.json();
    const response = await handleSuspendWorkflow(executionId, body, deps, logger);
    if (!response.success) {
      return c.json(response, 500);
    }
    return c.json(response, 200);
  });

  // Cancel workflow execution
  app.openapi(cancelWorkflowRoute, async (c) => {
    const executionId = c.req.param("executionId");
    if (!executionId) {
      throw new Error("Missing execution id parameter");
    }
    const body = await c.req.json();
    const response = await handleCancelWorkflow(executionId, body, deps, logger);
    if (!response.success) {
      const errorMessage = response.error || "";
      const status = errorMessage.includes("not found")
        ? 404
        : errorMessage.includes("not cancellable")
          ? 409
          : 500;
      return c.json(response, status);
    }
    return c.json(response, 200);
  });

  // Resume workflow execution
  app.openapi(resumeWorkflowRoute, async (c) => {
    const workflowId = c.req.param("id");
    const executionId = c.req.param("executionId");
    if (!workflowId || !executionId) {
      throw new Error("Missing workflow or execution id parameter");
    }
    const body = await c.req.json();
    const response = await handleResumeWorkflow(workflowId, executionId, body, deps, logger);
    if (!response.success) {
      return c.json(response, 500);
    }
    return c.json(response, 200);
  });

  // Get workflow execution state
  app.get("/workflows/:id/executions/:executionId/state", async (c) => {
    const workflowId = c.req.param("id");
    const executionId = c.req.param("executionId");
    if (!workflowId || !executionId) {
      throw new Error("Missing workflow or execution id parameter");
    }
    const response = await handleGetWorkflowState(workflowId, executionId, deps, logger);
    if (!response.success) {
      return c.json(response, response.error?.includes("not found") ? 404 : 500);
    }
    return c.json(response, 200);
  });
}

/**
 * Register log routes
 */
export function registerLogRoutes(app: OpenAPIHonoType, deps: ServerProviderDeps, logger: Logger) {
  // GET /api/logs - Get logs with filters
  app.openapi(getLogsRoute, async (c) => {
    const query = c.req.query();
    const options = {
      limit: query.limit ? Number(query.limit) : undefined,
      level: query.level as any,
      agentId: query.agentId,
      workflowId: query.workflowId,
      conversationId: query.conversationId,
      executionId: query.executionId,
      since: query.since,
      until: query.until,
    };

    const response = await handleGetLogs(options, deps, logger);

    if (!response.success) {
      return c.json(response as any, 500);
    }

    // Map the response to match the OpenAPI schema
    const mappedResponse = mapLogResponse(response);
    return c.json(mappedResponse as any, 200);
  });
}

/**
 * Register update routes
 */
export function registerUpdateRoutes(
  app: OpenAPIHonoType,
  deps: ServerProviderDeps,
  logger: Logger,
) {
  // GET /updates - Check for updates
  app.get(UPDATE_ROUTES.checkUpdates.path, async (c) => {
    const response = await handleCheckUpdates(deps, logger);
    if (!response.success) {
      return c.json(response, 500);
    }
    return c.json(response, 200);
  });

  // POST /updates - Install updates
  app.post(UPDATE_ROUTES.installUpdates.path, async (c) => {
    let packageName: string | undefined;

    try {
      const body = (await c.req.json()) as { packageName?: unknown };
      if (typeof body?.packageName === "string") {
        packageName = body.packageName;
      }
    } catch (error) {
      logger.warn("Failed to parse update install request body", { error });
    }

    const response = await handleInstallUpdates(packageName, deps, logger);
    if (!response.success) {
      return c.json(response, 500);
    }
    return c.json(response, 200);
  });

  // POST /updates/:packageName - Install single package update
  app.post("/updates/:packageName", async (c) => {
    const packageName = c.req.param("packageName");

    if (!packageName) {
      return c.json({ success: false, error: "Package name is required" }, 400);
    }

    const response = await handleInstallUpdates(packageName, deps, logger);
    if (!response.success) {
      return c.json(response, 500);
    }
    return c.json(response, 200);
  });
}

export { registerObservabilityRoutes } from "./observability";

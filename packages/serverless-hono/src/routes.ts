import {
  type A2AServerRegistry,
  SERVERLESS_ENV_CONTEXT_KEY,
  type ServerProviderDeps,
} from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import { safeStringify } from "@voltagent/internal";
import {
  getLogsBySpanIdHandler,
  getLogsByTraceIdHandler,
  getObservabilityStatusHandler,
  getSpanByIdHandler,
  getTraceByIdHandler,
  getTracesHandler,
  getWorkingMemoryHandler,
  listMemoryConversationsHandler,
  listMemoryUsersHandler,
  queryLogsHandler,
} from "@voltagent/server-core";
import type {
  A2AServerLikeWithHandlers,
  JsonRpcRequest,
  JsonRpcResponse,
} from "@voltagent/server-core";
import {
  type A2ARequestContext,
  A2A_ROUTES,
  AGENT_ROUTES,
  MEMORY_ROUTES,
  OBSERVABILITY_MEMORY_ROUTES,
  OBSERVABILITY_ROUTES,
  TOOL_ROUTES,
  type TriggerHttpRequestContext,
  UPDATE_ROUTES,
  WORKFLOW_ROUTES,
  executeA2ARequest,
  executeTriggerHandler,
  getConversationMessagesHandler,
  getConversationStepsHandler,
  handleCancelWorkflow,
  handleChatStream,
  handleCheckUpdates,
  handleCloneMemoryConversation,
  handleCreateMemoryConversation,
  handleDeleteMemoryConversation,
  handleDeleteMemoryMessages,
  handleExecuteTool,
  handleExecuteWorkflow,
  handleGenerateObject,
  handleGenerateText,
  handleGetAgent,
  handleGetAgentHistory,
  handleGetAgentWorkspaceInfo,
  handleGetAgentWorkspaceSkill,
  handleGetAgents,
  handleGetLogs,
  handleGetMemoryConversation,
  handleGetMemoryWorkingMemory,
  handleGetWorkflow,
  handleGetWorkflowState,
  handleGetWorkflows,
  handleInstallUpdates,
  handleListAgentWorkspaceFiles,
  handleListAgentWorkspaceSkills,
  handleListMemoryConversationMessages,
  handleListMemoryConversations,
  handleListTools,
  handleListWorkflowRuns,
  handleReadAgentWorkspaceFile,
  handleResumeChatStream,
  handleResumeWorkflow,
  handleSaveMemoryMessages,
  handleSearchMemory,
  handleStreamObject,
  handleStreamText,
  handleStreamWorkflow,
  handleSuspendWorkflow,
  handleUpdateMemoryConversation,
  handleUpdateMemoryWorkingMemory,
  isErrorResponse,
  mapLogResponse,
  parseJsonRpcRequest,
  resolveAgentCard,
} from "@voltagent/server-core";
import type { Hono } from "hono";

function parseJsonSafe<T>(raw: string, logger: Logger): T | undefined {
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    logger.warn("Failed to parse JSON payload", { error });
    return undefined;
  }
}

async function readJsonBody<T>(c: any, logger: Logger): Promise<T | undefined> {
  try {
    return (await c.req.json()) as T;
  } catch (error) {
    logger.warn("Invalid JSON body received", { error, path: c.req.path });
    return undefined;
  }
}

function parseNumber(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseFloatValue(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

type MemoryRoutesCompat = typeof MEMORY_ROUTES & {
  getWorkingMemory?: { path: string };
};

const memoryWorkingMemoryPath =
  (MEMORY_ROUTES as MemoryRoutesCompat).getMemoryWorkingMemory?.path ??
  (MEMORY_ROUTES as MemoryRoutesCompat).getWorkingMemory?.path ??
  "/api/memory/conversations/:conversationId/working-memory";

function extractHeaders(
  headers: Headers | NodeJS.Dict<string | string[] | undefined>,
): Record<string, string> {
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  const result: Record<string, string> = {};
  Object.entries(headers).forEach(([key, value]) => {
    if (typeof value === "string") {
      result[key] = value;
    } else if (Array.isArray(value)) {
      result[key] = value.join(", ");
    }
  });
  return result;
}

type ServerlessEnv = Record<string, unknown>;

function getServerlessEnv(c: { env?: unknown }): ServerlessEnv | undefined {
  const env = c?.env;
  if (!env || typeof env !== "object" || Array.isArray(env)) {
    return undefined;
  }
  return env as ServerlessEnv;
}

function mergeContextWithServerlessEnv(
  context: unknown,
  env: ServerlessEnv | undefined,
): Map<string | symbol, unknown> | undefined {
  if (!env) {
    return context instanceof Map ? context : undefined;
  }

  const contextMap =
    context instanceof Map
      ? context
      : context && typeof context === "object" && !Array.isArray(context)
        ? new Map(Object.entries(context as Record<string, unknown>))
        : new Map<string | symbol, unknown>();

  if (!contextMap.has(SERVERLESS_ENV_CONTEXT_KEY)) {
    contextMap.set(SERVERLESS_ENV_CONTEXT_KEY, env);
  }

  return contextMap;
}

function withServerlessEnvInOptions(body: any, env: ServerlessEnv | undefined) {
  if (!env || !body || typeof body !== "object") {
    return body;
  }

  const options =
    body.options && typeof body.options === "object" && !Array.isArray(body.options)
      ? body.options
      : {};

  const context = mergeContextWithServerlessEnv(options.context, env);

  return {
    ...body,
    options: {
      ...options,
      context: context ?? options.context,
    },
  };
}

function withServerlessEnvInContext(body: any, env: ServerlessEnv | undefined) {
  if (!env || !body || typeof body !== "object") {
    return body;
  }

  const context = mergeContextWithServerlessEnv(body.context, env);

  return {
    ...body,
    context: context ?? body.context,
  };
}

function parseContextCandidate(candidate: unknown): A2ARequestContext | undefined {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return undefined;
  }

  const { userId, sessionId, metadata } = candidate as Record<string, unknown>;
  const context: A2ARequestContext = {};

  if (typeof userId === "string") {
    context.userId = userId;
  }

  if (typeof sessionId === "string") {
    context.sessionId = sessionId;
  }

  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    context.metadata = metadata as Record<string, unknown>;
  }

  return Object.keys(context).length > 0 ? context : undefined;
}

function mergeContexts(
  base: A2ARequestContext | undefined,
  next: A2ARequestContext | undefined,
): A2ARequestContext | undefined {
  if (!base) {
    return next;
  }
  if (!next) {
    return base;
  }

  const merged: A2ARequestContext = {
    ...base,
    ...next,
  };

  if (base.metadata || next.metadata) {
    merged.metadata = {
      ...(base.metadata ?? {}),
      ...(next.metadata ?? {}),
    };
  }

  return merged;
}

export function registerAgentRoutes(app: Hono, deps: ServerProviderDeps, logger: Logger) {
  app.get(AGENT_ROUTES.listAgents.path, async (c) => {
    const response = await handleGetAgents(deps, logger);
    return c.json(response, response.success ? 200 : 500);
  });

  app.get(AGENT_ROUTES.getAgent.path, async (c) => {
    const agentId = c.req.param("id");
    const response = await handleGetAgent(agentId, deps, logger);
    return c.json(response, response.success ? 200 : 500);
  });

  app.post(AGENT_ROUTES.generateText.path, async (c) => {
    const agentId = c.req.param("id");
    const body = await readJsonBody(c, logger);
    if (!body) {
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }
    const signal = c.req.raw.signal;
    const runtimeEnv = getServerlessEnv(c);
    const response = await handleGenerateText(
      agentId,
      withServerlessEnvInOptions(body, runtimeEnv),
      deps,
      logger,
      signal,
    );
    return c.json(response, response.success ? 200 : 500);
  });

  app.post(AGENT_ROUTES.streamText.path, async (c) => {
    const agentId = c.req.param("id");
    const body = await readJsonBody(c, logger);
    if (!body) {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const signal = c.req.raw.signal;
    const runtimeEnv = getServerlessEnv(c);
    const response = await handleStreamText(
      agentId,
      withServerlessEnvInOptions(body, runtimeEnv),
      deps,
      logger,
      signal,
    );
    return response;
  });

  app.post(AGENT_ROUTES.chatStream.path, async (c) => {
    const agentId = c.req.param("id");
    const body = await readJsonBody(c, logger);
    if (!body) {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const signal = c.req.raw.signal;
    const runtimeEnv = getServerlessEnv(c);
    return handleChatStream(
      agentId,
      withServerlessEnvInOptions(body, runtimeEnv),
      deps,
      logger,
      signal,
    );
  });

  app.get(AGENT_ROUTES.resumeChatStream.path, async (c) => {
    const agentId = c.req.param("id");
    const conversationId = c.req.param("conversationId");
    const userId = c.req.query("userId");
    if (!agentId || !conversationId) {
      return c.json({ error: "Missing agent or conversation id parameter" }, 400);
    }
    if (!userId) {
      return c.json({ error: "Missing userId parameter" }, 400);
    }
    return handleResumeChatStream(agentId, conversationId, deps, logger, userId);
  });

  app.post(AGENT_ROUTES.generateObject.path, async (c) => {
    const agentId = c.req.param("id");
    const body = await readJsonBody(c, logger);
    if (!body) {
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }
    const signal = c.req.raw.signal;
    const runtimeEnv = getServerlessEnv(c);
    const response = await handleGenerateObject(
      agentId,
      withServerlessEnvInOptions(body, runtimeEnv),
      deps,
      logger,
      signal,
    );
    return c.json(response, response.success ? 200 : 500);
  });

  app.post(AGENT_ROUTES.streamObject.path, async (c) => {
    const agentId = c.req.param("id");
    const body = await readJsonBody(c, logger);
    if (!body) {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const signal = c.req.raw.signal;
    const runtimeEnv = getServerlessEnv(c);
    return handleStreamObject(
      agentId,
      withServerlessEnvInOptions(body, runtimeEnv),
      deps,
      logger,
      signal,
    );
  });

  app.get(AGENT_ROUTES.getAgentHistory.path, async (c) => {
    const agentId = c.req.param("id");
    const page = Number.parseInt(c.req.query("page") || "0", 10);
    const limit = Number.parseInt(c.req.query("limit") || "10", 10);
    const response = await handleGetAgentHistory(agentId, page, limit, deps, logger);
    return c.json(response, response.success ? 200 : 500);
  });

  app.get(AGENT_ROUTES.getWorkspace.path, async (c) => {
    const agentId = c.req.param("id");
    const response = await handleGetAgentWorkspaceInfo(agentId, deps, logger);
    return c.json(response, response.success ? 200 : response.httpStatus || 500);
  });

  app.get(AGENT_ROUTES.listWorkspaceFiles.path, async (c) => {
    const agentId = c.req.param("id");
    const path = c.req.query("path") || undefined;
    const response = await handleListAgentWorkspaceFiles(agentId, { path }, deps, logger);
    return c.json(response, response.success ? 200 : response.httpStatus || 500);
  });

  app.get(AGENT_ROUTES.readWorkspaceFile.path, async (c) => {
    const agentId = c.req.param("id");
    const path = c.req.query("path") || undefined;
    const offset = c.req.query("offset");
    const limit = c.req.query("limit");
    const response = await handleReadAgentWorkspaceFile(
      agentId,
      { path, offset, limit },
      deps,
      logger,
    );
    return c.json(response, response.success ? 200 : response.httpStatus || 500);
  });

  app.get(AGENT_ROUTES.listWorkspaceSkills.path, async (c) => {
    const agentId = c.req.param("id");
    const refresh = c.req.query("refresh");
    const response = await handleListAgentWorkspaceSkills(agentId, { refresh }, deps, logger);
    return c.json(response, response.success ? 200 : response.httpStatus || 500);
  });

  app.get(AGENT_ROUTES.getWorkspaceSkill.path, async (c) => {
    const agentId = c.req.param("id");
    const skillId = c.req.param("skillId");
    const response = await handleGetAgentWorkspaceSkill(agentId, skillId, deps, logger);
    return c.json(response, response.success ? 200 : response.httpStatus || 500);
  });
}

export function registerWorkflowRoutes(app: Hono, deps: ServerProviderDeps, logger: Logger) {
  app.get(WORKFLOW_ROUTES.listWorkflows.path, async (c) => {
    const response = await handleGetWorkflows(deps, logger);
    return c.json(response, response.success ? 200 : 500);
  });

  app.get(WORKFLOW_ROUTES.getWorkflow.path, async (c) => {
    const workflowId = c.req.param("id");
    const response = await handleGetWorkflow(workflowId, deps, logger);
    return c.json(response, response.success ? 200 : 500);
  });

  app.post(WORKFLOW_ROUTES.executeWorkflow.path, async (c) => {
    const workflowId = c.req.param("id");
    const body = await readJsonBody(c, logger);
    if (!body) {
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }
    const runtimeEnv = getServerlessEnv(c);
    const response = await handleExecuteWorkflow(
      workflowId,
      withServerlessEnvInOptions(body, runtimeEnv),
      deps,
      logger,
    );
    return c.json(response, response.success ? 200 : 500);
  });

  app.post(WORKFLOW_ROUTES.streamWorkflow.path, async (c) => {
    const workflowId = c.req.param("id");
    const body = await readJsonBody(c, logger);
    if (!body) {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const runtimeEnv = getServerlessEnv(c);
    const response = await handleStreamWorkflow(
      workflowId,
      withServerlessEnvInOptions(body, runtimeEnv),
      deps,
      logger,
    );

    if (isErrorResponse(response)) {
      return c.json(response, 500);
    }

    return c.body(response, 200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
  });

  app.post(WORKFLOW_ROUTES.suspendWorkflow.path, async (c) => {
    const executionId = c.req.param("executionId");
    const body = await readJsonBody(c, logger);
    if (!body) {
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }
    const response = await handleSuspendWorkflow(executionId, body, deps, logger);
    if (response.success) {
      return c.json(response, 200);
    }
    const errorMessage = response.error || "";
    const status = errorMessage.includes("not found")
      ? 404
      : errorMessage.includes("not supported") || errorMessage.includes("suspendable")
        ? 400
        : 500;
    return c.json(response, status);
  });

  app.post(WORKFLOW_ROUTES.cancelWorkflow.path, async (c) => {
    const executionId = c.req.param("executionId");
    const body = await readJsonBody(c, logger);
    if (!body) {
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }
    const response = await handleCancelWorkflow(executionId, body, deps, logger);
    if (response.success) {
      return c.json(response, 200);
    }
    const errorMessage = response.error || "";
    const status = errorMessage.includes("not found")
      ? 404
      : errorMessage.includes("not cancellable")
        ? 409
        : 500;
    return c.json(response, status);
  });

  app.post(WORKFLOW_ROUTES.resumeWorkflow.path, async (c) => {
    const workflowId = c.req.param("id");
    const executionId = c.req.param("executionId");
    const body = await readJsonBody(c, logger);
    if (!body) {
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }
    const response = await handleResumeWorkflow(workflowId, executionId, body, deps, logger);
    return c.json(response, response.success ? 200 : 500);
  });

  app.get(WORKFLOW_ROUTES.listWorkflowRuns.path, async (c) => {
    const query = c.req.query();
    const response = await handleListWorkflowRuns(undefined, query, deps, logger);
    const status = response.success ? 200 : response.error?.includes("not found") ? 404 : 500;
    return c.json(response, status);
  });

  app.get(WORKFLOW_ROUTES.getWorkflowState.path, async (c) => {
    const workflowId = c.req.param("id");
    const executionId = c.req.param("executionId");
    const response = await handleGetWorkflowState(workflowId, executionId, deps, logger);
    const status = response.success ? 200 : response.error?.includes("not found") ? 404 : 500;
    return c.json(response, status);
  });
}

export function registerToolRoutes(app: Hono, deps: ServerProviderDeps, logger: Logger) {
  app.get(TOOL_ROUTES.listTools.path, async (c) => {
    const response = await handleListTools(deps, logger);
    const status = response.success ? 200 : response.httpStatus || 500;
    return c.json(response, status);
  });

  app.post(TOOL_ROUTES.executeTool.path, async (c) => {
    const toolName = c.req.param("name");
    const body = await readJsonBody(c, logger);
    if (!body) {
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }

    const runtimeEnv = getServerlessEnv(c);
    const response = await handleExecuteTool(
      toolName,
      withServerlessEnvInContext(body, runtimeEnv),
      deps,
      logger,
    );
    const status = response.success ? 200 : response.httpStatus || 500;
    return c.json(response, status);
  });
}

export function registerLogRoutes(app: Hono, deps: ServerProviderDeps, logger: Logger) {
  app.get("/logs", async (c) => {
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
      return c.json(response, 500);
    }

    const mapped = mapLogResponse(response);
    return c.json(mapped, 200);
  });
}

export function registerUpdateRoutes(app: Hono, deps: ServerProviderDeps, logger: Logger) {
  app.get(UPDATE_ROUTES.checkUpdates.path, async (c) => {
    const response = await handleCheckUpdates(deps, logger);
    return c.json(response, response.success ? 200 : 500);
  });

  app.post(UPDATE_ROUTES.installUpdates.path, async (c) => {
    const body = (await readJsonBody<{ packageName?: string }>(c, logger)) ?? {};
    const response = await handleInstallUpdates(body.packageName, deps, logger);
    return c.json(response, response.success ? 200 : 500);
  });
}

export function registerMemoryRoutes(app: Hono, deps: ServerProviderDeps, logger: Logger) {
  app.get(MEMORY_ROUTES.listConversations.path, async (c) => {
    const query = c.req.query();
    const response = await handleListMemoryConversations(deps, {
      agentId: query.agentId,
      resourceId: query.resourceId,
      userId: query.userId,
      limit: parseNumber(query.limit),
      offset: parseNumber(query.offset),
      orderBy: query.orderBy as "created_at" | "updated_at" | "title" | undefined,
      orderDirection: query.orderDirection as "ASC" | "DESC" | undefined,
    });
    return c.json(response, response.success ? 200 : (response.httpStatus ?? 500));
  });

  app.get(MEMORY_ROUTES.getConversation.path, async (c) => {
    const conversationId = c.req.param("conversationId");
    const query = c.req.query();
    const response = await handleGetMemoryConversation(deps, conversationId, {
      agentId: query.agentId,
    });
    return c.json(response, response.success ? 200 : (response.httpStatus ?? 500));
  });

  app.get(MEMORY_ROUTES.listMessages.path, async (c) => {
    const conversationId = c.req.param("conversationId");
    const query = c.req.query();
    const response = await handleListMemoryConversationMessages(deps, conversationId, {
      agentId: query.agentId,
      limit: parseNumber(query.limit),
      before: parseDate(query.before),
      after: parseDate(query.after),
      roles: query.roles ? query.roles.split(",") : undefined,
      userId: query.userId,
    });
    return c.json(response, response.success ? 200 : (response.httpStatus ?? 500));
  });

  app.get(memoryWorkingMemoryPath, async (c) => {
    const conversationId = c.req.param("conversationId");
    const query = c.req.query();
    const response = await handleGetMemoryWorkingMemory(deps, conversationId, {
      agentId: query.agentId,
      scope: query.scope === "user" ? "user" : "conversation",
      userId: query.userId,
    });
    return c.json(response, response.success ? 200 : (response.httpStatus ?? 500));
  });

  app.post(MEMORY_ROUTES.saveMessages.path, async (c) => {
    const query = c.req.query();
    const body = await readJsonBody<any>(c, logger);
    if (!body) {
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }
    const response = await handleSaveMemoryMessages(deps, {
      ...body,
      agentId: (body.agentId as string | undefined) ?? query.agentId,
    });
    return c.json(response, response.success ? 200 : (response.httpStatus ?? 500));
  });

  app.post(MEMORY_ROUTES.createConversation.path, async (c) => {
    const query = c.req.query();
    const body = await readJsonBody<any>(c, logger);
    if (!body) {
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }
    const response = await handleCreateMemoryConversation(deps, {
      ...body,
      agentId: (body.agentId as string | undefined) ?? query.agentId,
    });
    return c.json(response, response.success ? 200 : (response.httpStatus ?? 500));
  });

  app.patch(MEMORY_ROUTES.updateConversation.path, async (c) => {
    const conversationId = c.req.param("conversationId");
    const query = c.req.query();
    const body = await readJsonBody<any>(c, logger);
    if (!body) {
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }
    const response = await handleUpdateMemoryConversation(deps, conversationId, {
      ...body,
      agentId: (body.agentId as string | undefined) ?? query.agentId,
    });
    return c.json(response, response.success ? 200 : (response.httpStatus ?? 500));
  });

  app.delete(MEMORY_ROUTES.deleteConversation.path, async (c) => {
    const conversationId = c.req.param("conversationId");
    const query = c.req.query();
    const response = await handleDeleteMemoryConversation(deps, conversationId, {
      agentId: query.agentId,
    });
    return c.json(response, response.success ? 200 : (response.httpStatus ?? 500));
  });

  app.post(MEMORY_ROUTES.cloneConversation.path, async (c) => {
    const conversationId = c.req.param("conversationId");
    const query = c.req.query();
    const body = await readJsonBody<any>(c, logger);
    if (!body) {
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }
    const response = await handleCloneMemoryConversation(deps, conversationId, {
      ...body,
      agentId: (body.agentId as string | undefined) ?? query.agentId,
    });
    return c.json(response, response.success ? 200 : (response.httpStatus ?? 500));
  });

  app.post(MEMORY_ROUTES.updateWorkingMemory.path, async (c) => {
    const conversationId = c.req.param("conversationId");
    const query = c.req.query();
    const body = await readJsonBody<any>(c, logger);
    if (!body) {
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }
    const response = await handleUpdateMemoryWorkingMemory(deps, conversationId, {
      ...body,
      agentId: (body.agentId as string | undefined) ?? query.agentId,
    });
    return c.json(response, response.success ? 200 : (response.httpStatus ?? 500));
  });

  app.post(MEMORY_ROUTES.deleteMessages.path, async (c) => {
    const query = c.req.query();
    const body = await readJsonBody<any>(c, logger);
    if (!body) {
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }
    const response = await handleDeleteMemoryMessages(deps, {
      ...body,
      agentId: (body.agentId as string | undefined) ?? query.agentId,
    });
    return c.json(response, response.success ? 200 : (response.httpStatus ?? 500));
  });

  app.get(MEMORY_ROUTES.searchMemory.path, async (c) => {
    const query = c.req.query();
    const response = await handleSearchMemory(deps, {
      agentId: query.agentId,
      searchQuery: query.searchQuery,
      limit: parseNumber(query.limit),
      threshold: parseFloatValue(query.threshold),
      conversationId: query.conversationId,
      userId: query.userId,
    });
    return c.json(response, response.success ? 200 : (response.httpStatus ?? 500));
  });
}

export function registerObservabilityRoutes(app: Hono, deps: ServerProviderDeps, logger: Logger) {
  app.post(OBSERVABILITY_ROUTES.setupObservability.path, (c) =>
    c.json(
      {
        success: false,
        error: "Observability setup is not available in the serverless runtime.",
      },
      501,
    ),
  );

  app.get(OBSERVABILITY_ROUTES.getTraces.path, async (c) => {
    const query = c.req.query();
    logger.debug("[serverless] GET /observability/traces", { query });
    const result = await getTracesHandler(deps, query);
    return c.json(result, result.success ? 200 : 500);
  });

  app.get(OBSERVABILITY_ROUTES.getTraceById.path, async (c) => {
    const traceId = c.req.param("traceId");
    logger.debug("[serverless] GET /observability/traces/:traceId", { traceId });
    const result = await getTraceByIdHandler(traceId, deps);
    return c.json(result, result.success ? 200 : 404);
  });

  app.get(OBSERVABILITY_ROUTES.getSpanById.path, async (c) => {
    const spanId = c.req.param("spanId");
    logger.debug("[serverless] GET /observability/spans/:spanId", { spanId });
    const result = await getSpanByIdHandler(spanId, deps);
    return c.json(result, result.success ? 200 : 404);
  });

  app.get(OBSERVABILITY_ROUTES.getObservabilityStatus.path, async (c) => {
    logger.debug("[serverless] GET /observability/status");
    const result = await getObservabilityStatusHandler(deps);
    return c.json(result, result.success ? 200 : 500);
  });

  app.get(OBSERVABILITY_ROUTES.getLogsByTraceId.path, async (c) => {
    const traceId = c.req.param("traceId");
    logger.debug("[serverless] GET /observability/traces/:traceId/logs", { traceId });
    const result = await getLogsByTraceIdHandler(traceId, deps);
    return c.json(result, result.success ? 200 : 404);
  });

  app.get(OBSERVABILITY_ROUTES.getLogsBySpanId.path, async (c) => {
    const spanId = c.req.param("spanId");
    logger.debug("[serverless] GET /observability/spans/:spanId/logs", { spanId });
    const result = await getLogsBySpanIdHandler(spanId, deps);
    return c.json(result, result.success ? 200 : 404);
  });

  app.get(OBSERVABILITY_ROUTES.queryLogs.path, async (c) => {
    const query = c.req.query();
    logger.debug("[serverless] GET /observability/logs", { query });
    const result = await queryLogsHandler(query, deps);
    return c.json(result, result.success ? 200 : 400);
  });

  app.get(OBSERVABILITY_MEMORY_ROUTES.listMemoryUsers.path, async (c) => {
    const query = c.req.query();
    logger.debug("[serverless] GET /observability/memory/users", { query });
    const result = await listMemoryUsersHandler(deps, {
      agentId: query.agentId,
      limit: query.limit ? Number.parseInt(query.limit, 10) : undefined,
      offset: query.offset ? Number.parseInt(query.offset, 10) : undefined,
      search: query.search,
    });

    return c.json(result, result.success ? 200 : 500);
  });

  app.get(OBSERVABILITY_MEMORY_ROUTES.listMemoryConversations.path, async (c) => {
    const query = c.req.query();
    logger.debug("[serverless] GET /observability/memory/conversations", { query });
    const result = await listMemoryConversationsHandler(deps, {
      agentId: query.agentId,
      userId: query.userId,
      limit: query.limit ? Number.parseInt(query.limit, 10) : undefined,
      offset: query.offset ? Number.parseInt(query.offset, 10) : undefined,
      orderBy: query.orderBy as "created_at" | "updated_at" | "title" | undefined,
      orderDirection: query.orderDirection as "ASC" | "DESC" | undefined,
    });

    return c.json(result, result.success ? 200 : 500);
  });

  app.get(OBSERVABILITY_MEMORY_ROUTES.getMemoryConversationMessages.path, async (c) => {
    const conversationId = c.req.param("conversationId");
    const query = c.req.query();
    logger.debug(
      `[serverless] GET /observability/memory/conversations/${conversationId}/messages`,
      { query },
    );

    const before = query.before ? new Date(query.before) : undefined;
    const after = query.after ? new Date(query.after) : undefined;

    const result = await getConversationMessagesHandler(deps, conversationId, {
      agentId: query.agentId,
      limit: query.limit ? Number.parseInt(query.limit, 10) : undefined,
      before: before && !Number.isNaN(before.getTime()) ? before : undefined,
      after: after && !Number.isNaN(after.getTime()) ? after : undefined,
      roles: query.roles ? query.roles.split(",") : undefined,
    });

    if (!result.success) {
      return c.json(result, result.error === "Conversation not found" ? 404 : 500);
    }

    return c.json(result, 200);
  });

  app.get(OBSERVABILITY_MEMORY_ROUTES.getConversationSteps.path, async (c) => {
    const conversationId = c.req.param("conversationId");
    const query = c.req.query();
    logger.debug(`[serverless] GET /observability/memory/conversations/${conversationId}/steps`, {
      query,
    });

    const result = await getConversationStepsHandler(deps, conversationId, {
      agentId: query.agentId,
      limit: query.limit ? Number.parseInt(query.limit, 10) : undefined,
      operationId: query.operationId,
    });

    if (!result.success) {
      return c.json(result, result.error === "Conversation not found" ? 404 : 500);
    }

    return c.json(result, 200);
  });

  app.get(OBSERVABILITY_MEMORY_ROUTES.getWorkingMemory.path, async (c) => {
    const query = c.req.query();
    logger.debug("[serverless] GET /observability/memory/working-memory", { query });

    const scope =
      query.scope === "user" ? "user" : query.scope === "conversation" ? "conversation" : undefined;

    if (!scope) {
      return c.json(
        { success: false, error: "Invalid scope. Expected 'conversation' or 'user'." },
        400,
      );
    }

    const result = await getWorkingMemoryHandler(deps, {
      agentId: query.agentId,
      scope,
      conversationId: query.conversationId,
      userId: query.userId,
    });

    if (!result.success) {
      return c.json(result, result.error === "Working memory not found" ? 404 : 500);
    }

    return c.json(result, 200);
  });
}

export function registerTriggerRoutes(app: Hono, deps: ServerProviderDeps, logger: Logger) {
  const triggers = deps.triggerRegistry.list();
  triggers.forEach((trigger) => {
    const method = trigger.method ?? "post";
    const handler = async (c: any) => {
      const body = await readJsonBody<unknown>(c, logger);
      const queryParams = c.req.query();
      const context: TriggerHttpRequestContext = {
        body,
        headers: extractHeaders(c.req.raw?.headers ?? new Headers()),
        query:
          queryParams && typeof queryParams === "object"
            ? { ...queryParams }
            : ({} as Record<string, string>),
        raw: c.req.raw,
      };

      const response = await executeTriggerHandler(trigger, context, deps, logger);

      // Ensure spans are flushed (using waitUntil if available)
      // This is critical for serverless environments to avoid orphan spans
      const observability = deps.observability as any;
      if (observability?.flushOnFinish) {
        await observability.flushOnFinish();
      } else if (observability?.forceFlush) {
        await observability.forceFlush();
      }

      return c.json(response.body ?? { success: true }, response.status, response.headers);
    };

    if (typeof (app as any)[method] !== "function") {
      logger.warn(
        `Skipping trigger ${trigger.name}: method ${method} is not supported in the serverless adapter`,
      );
      return;
    }

    (app as any)[method](trigger.path, handler);
    logger.info("[volt] Trigger route registered", {
      trigger: trigger.name,
      method: method.toUpperCase(),
      path: trigger.path,
    });
  });
}

export function registerA2ARoutes(app: Hono, deps: ServerProviderDeps, logger: Logger) {
  const registry = deps.a2a?.registry as A2AServerRegistry<A2AServerLikeWithHandlers> | undefined;

  if (!registry) {
    logger.debug("A2A server registry not available on server deps; skipping A2A routes");
    return;
  }

  app.get(A2A_ROUTES.agentCard.path, (c) => {
    const serverId = c.req.param("serverId");
    if (!serverId) {
      return c.json({ success: false, error: "Missing serverId parameter" }, 400);
    }
    try {
      const card = resolveAgentCard(registry, serverId, serverId, {});
      return c.json(card, 200);
    } catch (error) {
      const status = error instanceof Error && error.message.includes("not found") ? 404 : 400;
      return c.json(
        { success: false, error: error instanceof Error ? error.message : String(error) },
        status,
      );
    }
  });

  app.post(A2A_ROUTES.jsonRpc.path, async (c) => {
    const serverId = c.req.param("serverId");
    if (!serverId) {
      return c.json(
        { jsonrpc: "2.0", error: { code: -32600, message: "Missing serverId" }, id: null },
        400,
      );
    }
    type JsonRpcPayload = ReturnType<typeof parseJsonRpcRequest>;
    let request: JsonRpcPayload | undefined;
    let context: A2ARequestContext | undefined;

    try {
      const queryContext = c.req.query("context") ?? c.req.query("runtimeContext");
      if (queryContext) {
        const parsedQueryContext = parseJsonSafe<Record<string, unknown>>(queryContext, logger);
        context = mergeContexts(context, parseContextCandidate(parsedQueryContext));
      }

      const body = await readJsonBody<Record<string, unknown> | JsonRpcRequest | JsonRpcRequest[]>(
        c,
        logger,
      );
      if (!body) {
        return c.json(
          { jsonrpc: "2.0", error: { code: -32600, message: "Invalid request" }, id: null },
          400,
        );
      }

      if (typeof (body as Record<string, unknown>).context !== "undefined") {
        const { context: bodyContext, ...rest } = body as Record<string, unknown>;
        context = mergeContexts(context, parseContextCandidate(bodyContext));
        request = parseJsonRpcRequest(rest as unknown);
      } else {
        request = parseJsonRpcRequest(body as unknown);
      }
    } catch (error) {
      return c.json(
        { jsonrpc: "2.0", error: { code: -32600, message: String(error) }, id: null },
        400,
      );
    }

    const response = await executeA2ARequest({
      registry,
      serverId,
      request,
      context,
      logger,
    });

    if ("kind" in response && response.kind === "stream") {
      const { stream, id } = response;
      const encoder = new TextEncoder();
      const abortSignal = c.req.raw.signal;
      let abortListener: (() => void) | undefined;
      let cleanedUp = false;

      const cleanup = async () => {
        if (abortSignal && abortListener) {
          abortSignal.removeEventListener("abort", abortListener);
          abortListener = undefined;
        }
        if (!cleanedUp && typeof stream.return === "function") {
          cleanedUp = true;
          try {
            await stream.return(undefined as any);
          } catch {
            // ignore completion errors
          }
        }
      };

      const sseStream = new ReadableStream<Uint8Array>({
        async start(controller) {
          if (abortSignal) {
            if (abortSignal.aborted) {
              await cleanup();
              controller.close();
              return;
            }

            abortListener = () => {
              controller.close();
              void cleanup();
            };

            abortSignal.addEventListener("abort", abortListener, { once: true });
          }

          try {
            for await (const chunk of stream) {
              const payload = safeStringify(chunk);
              controller.enqueue(encoder.encode(`data: \u001E${payload}\n\n`));
            }
          } catch (error) {
            const payload = safeStringify({
              jsonrpc: "2.0",
              error: { code: -32603, message: String(error) },
              id,
            });
            controller.enqueue(encoder.encode(`data: \u001E${payload}\n\n`));
          } finally {
            await cleanup();
            controller.close();
          }
        },
        async cancel() {
          await cleanup();
        },
      });

      return new Response(sseStream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    const jsonResponse = response as JsonRpcResponse;
    return c.json(jsonResponse, jsonResponse.error ? 400 : 200);
  });
}

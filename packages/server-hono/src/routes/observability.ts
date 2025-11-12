/**
 * Observability route handlers for Hono
 */

import type { ServerProviderDeps } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import {
  OBSERVABILITY_MEMORY_ROUTES,
  OBSERVABILITY_ROUTES,
  getConversationMessagesHandler,
  getConversationStepsHandler,
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
  setupObservabilityHandler,
} from "@voltagent/server-core";
import type { OpenAPIHonoType } from "../zod-openapi-compat";

/**
 * Register observability routes
 */
export function registerObservabilityRoutes(
  app: OpenAPIHonoType,
  deps: ServerProviderDeps,
  logger: Logger,
) {
  // Setup observability configuration
  app.post(OBSERVABILITY_ROUTES.setupObservability.path, async (c) => {
    const body = await c.req.json();
    logger.trace("POST /setup-observability - configuring observability", {
      hasKeys: !!(body.publicKey && body.secretKey),
    });
    const result = await setupObservabilityHandler(body, deps);
    return c.json(result, result.success ? 200 : result.error?.includes("Missing") ? 400 : 500);
  });

  // Get all traces with optional agentId filter
  app.get(OBSERVABILITY_ROUTES.getTraces.path, async (c) => {
    const query = c.req.query();
    logger.trace("GET /observability/traces - fetching traces", { query });
    const result = await getTracesHandler(deps, query);
    return c.json(result, result.success ? 200 : 500);
  });

  // Get specific trace by ID
  app.get(OBSERVABILITY_ROUTES.getTraceById.path, async (c) => {
    const traceId = c.req.param("traceId");
    logger.trace(`GET /observability/traces/${traceId} - fetching trace`);
    const result = await getTraceByIdHandler(traceId, deps);
    return c.json(result, result.success ? 200 : 404);
  });

  // Get specific span by ID
  app.get(OBSERVABILITY_ROUTES.getSpanById.path, async (c) => {
    const spanId = c.req.param("spanId");
    logger.trace(`GET /observability/spans/${spanId} - fetching span`);
    const result = await getSpanByIdHandler(spanId, deps);
    return c.json(result, result.success ? 200 : 404);
  });

  // Get observability status
  app.get(OBSERVABILITY_ROUTES.getObservabilityStatus.path, async (c) => {
    logger.trace("GET /observability/status - fetching status");
    const result = await getObservabilityStatusHandler(deps);
    return c.json(result, result.success ? 200 : 500);
  });

  // Get logs by trace ID
  app.get(OBSERVABILITY_ROUTES.getLogsByTraceId.path, async (c) => {
    const traceId = c.req.param("traceId");
    logger.trace(`GET /observability/traces/${traceId}/logs - fetching logs`);
    const result = await getLogsByTraceIdHandler(traceId, deps);
    return c.json(result, result.success ? 200 : 404);
  });

  // Get logs by span ID
  app.get(OBSERVABILITY_ROUTES.getLogsBySpanId.path, async (c) => {
    const spanId = c.req.param("spanId");
    logger.trace(`GET /observability/spans/${spanId}/logs - fetching logs`);
    const result = await getLogsBySpanIdHandler(spanId, deps);
    return c.json(result, result.success ? 200 : 404);
  });

  // Query logs with filters
  app.get(OBSERVABILITY_ROUTES.queryLogs.path, async (c) => {
    const query = c.req.query();
    logger.trace("GET /observability/logs - querying logs", { query });
    const result = await queryLogsHandler(query, deps);
    return c.json(result, result.success ? 200 : 400);
  });

  // List memory users
  app.get(OBSERVABILITY_MEMORY_ROUTES.listMemoryUsers.path, async (c) => {
    const query = c.req.query();
    logger.trace("GET /observability/memory/users - fetching memory users", { query });
    const result = await listMemoryUsersHandler(deps, {
      agentId: query.agentId,
      limit: query.limit ? Number.parseInt(query.limit, 10) : undefined,
      offset: query.offset ? Number.parseInt(query.offset, 10) : undefined,
      search: query.search,
    });

    return c.json(result, result.success ? 200 : 500);
  });

  // List memory conversations
  app.get(OBSERVABILITY_MEMORY_ROUTES.listMemoryConversations.path, async (c) => {
    const query = c.req.query();
    logger.trace("GET /observability/memory/conversations - fetching conversations", { query });
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

  // Get conversation messages
  app.get(OBSERVABILITY_MEMORY_ROUTES.getMemoryConversationMessages.path, async (c) => {
    const conversationId = c.req.param("conversationId");
    const query = c.req.query();
    logger.trace(
      `GET /observability/memory/conversations/${conversationId}/messages - fetching messages`,
      {
        query,
      },
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
    logger.trace(
      `GET /observability/memory/conversations/${conversationId}/steps - fetching steps`,
      { query },
    );

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

  // Get working memory
  app.get(OBSERVABILITY_MEMORY_ROUTES.getWorkingMemory.path, async (c) => {
    const query = c.req.query();
    logger.trace("GET /observability/memory/working-memory - fetching working memory", { query });

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

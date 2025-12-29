/**
 * Observability route handlers for Elysia
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
import type { Elysia } from "elysia";

/**
 * Register observability routes
 */
export function registerObservabilityRoutes(app: Elysia, deps: ServerProviderDeps, logger: Logger) {
  // Setup observability configuration
  app.post(OBSERVABILITY_ROUTES.setupObservability.path, async ({ body, set }) => {
    const bodyData = body as { publicKey?: string; secretKey?: string };
    logger.trace("POST /setup-observability - configuring observability", {
      hasKeys: !!(bodyData.publicKey && bodyData.secretKey),
    });
    const result = await setupObservabilityHandler(bodyData, deps);
    set.status = result.success ? 200 : result.error?.includes("Missing") ? 400 : 500;
    return result;
  });

  // Get all traces with optional agentId filter
  app.get(OBSERVABILITY_ROUTES.getTraces.path, async ({ query, set }) => {
    logger.trace("GET /observability/traces - fetching traces", { query });
    const result = await getTracesHandler(deps, query);
    set.status = result.success ? 200 : 500;
    return result;
  });

  // Get specific trace by ID
  app.get(OBSERVABILITY_ROUTES.getTraceById.path, async ({ params, set }) => {
    const traceId = params.traceId;
    logger.trace(`GET /observability/traces/${traceId} - fetching trace`);
    const result = await getTraceByIdHandler(traceId, deps);
    set.status = result.success ? 200 : 404;
    return result;
  });

  // Get specific span by ID
  app.get(OBSERVABILITY_ROUTES.getSpanById.path, async ({ params, set }) => {
    const spanId = params.spanId;
    logger.trace(`GET /observability/spans/${spanId} - fetching span`);
    const result = await getSpanByIdHandler(spanId, deps);
    set.status = result.success ? 200 : 404;
    return result;
  });

  // Get observability status
  app.get(OBSERVABILITY_ROUTES.getObservabilityStatus.path, async ({ set }) => {
    logger.trace("GET /observability/status - fetching status");
    const result = await getObservabilityStatusHandler(deps);
    set.status = result.success ? 200 : 500;
    return result;
  });

  // Get logs by trace ID
  app.get(OBSERVABILITY_ROUTES.getLogsByTraceId.path, async ({ params, set }) => {
    const traceId = params.traceId;
    logger.trace(`GET /observability/traces/${traceId}/logs - fetching logs`);
    const result = await getLogsByTraceIdHandler(traceId, deps);
    set.status = result.success ? 200 : 404;
    return result;
  });

  // Get logs by span ID
  app.get(OBSERVABILITY_ROUTES.getLogsBySpanId.path, async ({ params, set }) => {
    const spanId = params.spanId;
    logger.trace(`GET /observability/spans/${spanId}/logs - fetching logs`);
    const result = await getLogsBySpanIdHandler(spanId, deps);
    set.status = result.success ? 200 : 404;
    return result;
  });

  // Query logs with filters
  app.get(OBSERVABILITY_ROUTES.queryLogs.path, async ({ query, set }) => {
    logger.trace("GET /observability/logs - querying logs", { query });
    const result = await queryLogsHandler(query, deps);
    set.status = result.success ? 200 : 400;
    return result;
  });

  // List memory users
  app.get(OBSERVABILITY_MEMORY_ROUTES.listMemoryUsers.path, async ({ query, set }) => {
    logger.trace("GET /observability/memory/users - fetching memory users", { query });
    const result = await listMemoryUsersHandler(deps, {
      agentId: query.agentId,
      limit: query.limit ? Number.parseInt(query.limit as string, 10) : undefined,
      offset: query.offset ? Number.parseInt(query.offset as string, 10) : undefined,
      search: query.search as string | undefined,
    });
    set.status = result.success ? 200 : 500;
    return result;
  });

  // List memory conversations
  app.get(OBSERVABILITY_MEMORY_ROUTES.listMemoryConversations.path, async ({ query, set }) => {
    logger.trace("GET /observability/memory/conversations - fetching conversations", { query });
    const result = await listMemoryConversationsHandler(deps, {
      agentId: query.agentId as string | undefined,
      userId: query.userId as string | undefined,
      limit: query.limit ? Number.parseInt(query.limit as string, 10) : undefined,
      offset: query.offset ? Number.parseInt(query.offset as string, 10) : undefined,
      orderBy: query.orderBy as "created_at" | "updated_at" | "title" | undefined,
      orderDirection: query.orderDirection as "ASC" | "DESC" | undefined,
    });
    set.status = result.success ? 200 : 500;
    return result;
  });

  // Get conversation messages
  app.get(
    OBSERVABILITY_MEMORY_ROUTES.getMemoryConversationMessages.path,
    async ({ params, query, set }) => {
      const conversationId = params.conversationId;
      logger.trace(
        `GET /observability/memory/conversations/${conversationId}/messages - fetching messages`,
        { query },
      );

      const before = query.before ? new Date(query.before as string) : undefined;
      const after = query.after ? new Date(query.after as string) : undefined;

      const result = await getConversationMessagesHandler(deps, conversationId, {
        agentId: query.agentId as string | undefined,
        limit: query.limit ? Number.parseInt(query.limit as string, 10) : undefined,
        before: before && !Number.isNaN(before.getTime()) ? before : undefined,
        after: after && !Number.isNaN(after.getTime()) ? after : undefined,
        roles: query.roles ? (query.roles as string).split(",") : undefined,
      });

      if (!result.success) {
        set.status = result.error === "Conversation not found" ? 404 : 500;
        return result;
      }

      set.status = 200;
      return result;
    },
  );

  // Get conversation steps
  app.get(OBSERVABILITY_MEMORY_ROUTES.getConversationSteps.path, async ({ params, query, set }) => {
    const conversationId = params.conversationId;
    logger.trace(
      `GET /observability/memory/conversations/${conversationId}/steps - fetching steps`,
      { query },
    );

    const result = await getConversationStepsHandler(deps, conversationId, {
      agentId: query.agentId as string | undefined,
      limit: query.limit ? Number.parseInt(query.limit as string, 10) : undefined,
      operationId: query.operationId as string | undefined,
    });

    if (!result.success) {
      set.status = result.error === "Conversation not found" ? 404 : 500;
      return result;
    }

    set.status = 200;
    return result;
  });

  // Get working memory
  app.get(OBSERVABILITY_MEMORY_ROUTES.getWorkingMemory.path, async ({ query, set }) => {
    logger.trace("GET /observability/memory/working-memory - fetching working memory", { query });

    const scope =
      query.scope === "user" ? "user" : query.scope === "conversation" ? "conversation" : undefined;

    if (!scope) {
      set.status = 400;
      return { success: false, error: "Invalid scope. Expected 'conversation' or 'user'." };
    }

    const result = await getWorkingMemoryHandler(deps, {
      agentId: query.agentId as string | undefined,
      scope,
      conversationId: query.conversationId as string | undefined,
      userId: query.userId as string | undefined,
    });

    if (!result.success) {
      set.status = result.error === "Working memory not found" ? 404 : 500;
      return result;
    }

    set.status = 200;
    return result;
  });
}

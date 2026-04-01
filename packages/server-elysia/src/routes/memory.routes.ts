import type { ServerProviderDeps } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import {
  MEMORY_ROUTES,
  handleCloneMemoryConversation,
  handleCreateMemoryConversation,
  handleDeleteMemoryConversation,
  handleDeleteMemoryMessages,
  handleGetMemoryConversation,
  handleGetMemoryWorkingMemory,
  handleListMemoryConversationMessages,
  handleListMemoryConversations,
  handleSaveMemoryMessages,
  handleSearchMemory,
  handleUpdateMemoryConversation,
  handleUpdateMemoryWorkingMemory,
} from "@voltagent/server-core";
import type { Elysia } from "elysia";

function parseNumber(value?: string | number): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const parsed = typeof value === "number" ? value : Number.parseInt(value as string, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseFloatValue(value?: string | number): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const parsed = typeof value === "number" ? value : Number.parseFloat(value as string);
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

/**
 * Register memory routes
 */
export function registerMemoryRoutes(app: Elysia, deps: ServerProviderDeps, logger: Logger) {
  app.get(MEMORY_ROUTES.listConversations.path, async ({ query, set }) => {
    logger.trace("GET /api/memory/conversations - fetching conversations", { query });
    const response = await handleListMemoryConversations(deps, {
      agentId: query.agentId as string | undefined,
      resourceId: query.resourceId as string | undefined,
      userId: query.userId as string | undefined,
      limit: parseNumber(query.limit as string | number | undefined),
      offset: parseNumber(query.offset as string | number | undefined),
      orderBy: query.orderBy as "created_at" | "updated_at" | "title" | undefined,
      orderDirection: query.orderDirection as "ASC" | "DESC" | undefined,
    });
    set.status = response.success ? 200 : (response.httpStatus ?? 500);
    return response;
  });

  app.get(MEMORY_ROUTES.getConversation.path, async ({ params, query, set }) => {
    const conversationId = params.conversationId;
    logger.trace(`GET /api/memory/conversations/${conversationId} - fetching conversation`);
    const response = await handleGetMemoryConversation(deps, conversationId, {
      agentId: query.agentId as string | undefined,
    });
    set.status = response.success ? 200 : (response.httpStatus ?? 500);
    return response;
  });

  app.get(MEMORY_ROUTES.listMessages.path, async ({ params, query, set }) => {
    const conversationId = params.conversationId;
    logger.trace(`GET /api/memory/conversations/${conversationId}/messages - fetching messages`, {
      query,
    });
    const response = await handleListMemoryConversationMessages(deps, conversationId, {
      agentId: query.agentId as string | undefined,
      limit: parseNumber(query.limit as string | number | undefined),
      before: parseDate(query.before as string | undefined),
      after: parseDate(query.after as string | undefined),
      roles: query.roles ? String(query.roles).split(",") : undefined,
      userId: query.userId as string | undefined,
    });
    set.status = response.success ? 200 : (response.httpStatus ?? 500);
    return response;
  });

  app.get(memoryWorkingMemoryPath, async ({ params, query, set }) => {
    const conversationId = params.conversationId;
    logger.trace(
      `GET /api/memory/conversations/${conversationId}/working-memory - fetching working memory`,
      { query },
    );
    const response = await handleGetMemoryWorkingMemory(deps, conversationId, {
      agentId: query.agentId as string | undefined,
      scope: query.scope === "user" ? "user" : "conversation",
      userId: query.userId as string | undefined,
    });
    set.status = response.success ? 200 : (response.httpStatus ?? 500);
    return response;
  });

  app.post(MEMORY_ROUTES.saveMessages.path, async ({ body, query, set }) => {
    const payload = body as Record<string, unknown> | undefined;
    logger.trace("POST /api/memory/save-messages - saving messages", {
      messageCount: Array.isArray(payload?.messages) ? payload?.messages.length : 0,
    });
    const response = await handleSaveMemoryMessages(deps, {
      ...(payload ?? {}),
      agentId: (payload?.agentId as string | undefined) ?? (query.agentId as string | undefined),
    });
    set.status = response.success ? 200 : (response.httpStatus ?? 500);
    return response;
  });

  app.post(MEMORY_ROUTES.createConversation.path, async ({ body, query, set }) => {
    const payload = body as Record<string, unknown> | undefined;
    logger.trace("POST /api/memory/conversations - creating conversation");
    const response = await handleCreateMemoryConversation(deps, {
      ...(payload ?? {}),
      agentId: (payload?.agentId as string | undefined) ?? (query.agentId as string | undefined),
    });
    set.status = response.success ? 200 : (response.httpStatus ?? 500);
    return response;
  });

  app.patch(MEMORY_ROUTES.updateConversation.path, async ({ params, body, query, set }) => {
    const conversationId = params.conversationId;
    const payload = body as Record<string, unknown> | undefined;
    logger.trace(`PATCH /api/memory/conversations/${conversationId} - updating conversation`);
    const response = await handleUpdateMemoryConversation(deps, conversationId, {
      ...(payload ?? {}),
      agentId: (payload?.agentId as string | undefined) ?? (query.agentId as string | undefined),
    });
    set.status = response.success ? 200 : (response.httpStatus ?? 500);
    return response;
  });

  app.delete(MEMORY_ROUTES.deleteConversation.path, async ({ params, query, set }) => {
    const conversationId = params.conversationId;
    logger.trace(`DELETE /api/memory/conversations/${conversationId} - deleting conversation`);
    const response = await handleDeleteMemoryConversation(deps, conversationId, {
      agentId: query.agentId as string | undefined,
    });
    set.status = response.success ? 200 : (response.httpStatus ?? 500);
    return response;
  });

  app.post(MEMORY_ROUTES.cloneConversation.path, async ({ params, body, query, set }) => {
    const conversationId = params.conversationId;
    const payload = body as Record<string, unknown> | undefined;
    logger.trace(`POST /api/memory/conversations/${conversationId}/clone - cloning conversation`);
    const response = await handleCloneMemoryConversation(deps, conversationId, {
      ...(payload ?? {}),
      agentId: (payload?.agentId as string | undefined) ?? (query.agentId as string | undefined),
    });
    set.status = response.success ? 200 : (response.httpStatus ?? 500);
    return response;
  });

  app.post(MEMORY_ROUTES.updateWorkingMemory.path, async ({ params, body, query, set }) => {
    const conversationId = params.conversationId;
    const payload = body as Record<string, unknown> | undefined;
    logger.trace(
      `POST /api/memory/conversations/${conversationId}/working-memory - updating working memory`,
    );
    const response = await handleUpdateMemoryWorkingMemory(deps, conversationId, {
      ...(payload ?? {}),
      agentId: (payload?.agentId as string | undefined) ?? (query.agentId as string | undefined),
    });
    set.status = response.success ? 200 : (response.httpStatus ?? 500);
    return response;
  });

  app.post(MEMORY_ROUTES.deleteMessages.path, async ({ body, query, set }) => {
    const payload = body as Record<string, unknown> | undefined;
    logger.trace("POST /api/memory/messages/delete - deleting messages");
    const response = await handleDeleteMemoryMessages(deps, {
      ...(payload ?? {}),
      agentId: (payload?.agentId as string | undefined) ?? (query.agentId as string | undefined),
    });
    set.status = response.success ? 200 : (response.httpStatus ?? 500);
    return response;
  });

  app.get(MEMORY_ROUTES.searchMemory.path, async ({ query, set }) => {
    logger.trace("GET /api/memory/search - searching memory", { query });
    const response = await handleSearchMemory(deps, {
      agentId: query.agentId as string | undefined,
      searchQuery: query.searchQuery as string | undefined,
      limit: parseNumber(query.limit as string | number | undefined),
      threshold: parseFloatValue(query.threshold as string | number | undefined),
      conversationId: query.conversationId as string | undefined,
      userId: query.userId as string | undefined,
    });
    set.status = response.success ? 200 : (response.httpStatus ?? 500);
    return response;
  });
}

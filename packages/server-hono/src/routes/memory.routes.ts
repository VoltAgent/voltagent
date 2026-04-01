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
import type { OpenAPIHonoType } from "../zod-openapi-compat";

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

const orderByAllowlist = new Set(["created_at", "updated_at", "title"]);

function parseOrderBy(value?: string): "created_at" | "updated_at" | "title" | undefined {
  if (!value || !orderByAllowlist.has(value)) {
    return undefined;
  }
  return value as "created_at" | "updated_at" | "title";
}

function parseOrderDirection(value?: string): "ASC" | "DESC" | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.toUpperCase();
  if (normalized === "ASC" || normalized === "DESC") {
    return normalized;
  }
  return undefined;
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
export function registerMemoryRoutes(
  app: OpenAPIHonoType,
  deps: ServerProviderDeps,
  logger: Logger,
) {
  app.get(MEMORY_ROUTES.listConversations.path, async (c) => {
    const query = c.req.query();
    logger.trace("GET /api/memory/conversations - fetching conversations", { query });
    const response = await handleListMemoryConversations(deps, {
      agentId: query.agentId,
      resourceId: query.resourceId,
      userId: query.userId,
      limit: parseNumber(query.limit),
      offset: parseNumber(query.offset),
      orderBy: parseOrderBy(query.orderBy),
      orderDirection: parseOrderDirection(query.orderDirection),
    });

    return c.json(response, response.success ? 200 : (response.httpStatus ?? 500));
  });

  app.get(MEMORY_ROUTES.getConversation.path, async (c) => {
    const conversationId = c.req.param("conversationId");
    const query = c.req.query();
    logger.trace(`GET /api/memory/conversations/${conversationId} - fetching conversation`);
    const response = await handleGetMemoryConversation(deps, conversationId, {
      agentId: query.agentId,
    });
    return c.json(response, response.success ? 200 : (response.httpStatus ?? 500));
  });

  app.get(MEMORY_ROUTES.listMessages.path, async (c) => {
    const conversationId = c.req.param("conversationId");
    const query = c.req.query();
    logger.trace(`GET /api/memory/conversations/${conversationId}/messages - fetching messages`, {
      query,
    });
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
    logger.trace(
      `GET /api/memory/conversations/${conversationId}/working-memory - fetching working memory`,
      { query },
    );
    const response = await handleGetMemoryWorkingMemory(deps, conversationId, {
      agentId: query.agentId,
      scope: query.scope === "user" ? "user" : "conversation",
      userId: query.userId,
    });
    return c.json(response, response.success ? 200 : (response.httpStatus ?? 500));
  });

  app.post(MEMORY_ROUTES.saveMessages.path, async (c) => {
    const query = c.req.query();
    let body: any;
    try {
      body = await c.req.json();
    } catch (error) {
      logger.warn("Invalid JSON body for save messages", { error });
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }
    logger.trace("POST /api/memory/save-messages - saving messages", {
      messageCount: Array.isArray(body?.messages) ? body.messages.length : 0,
    });
    const response = await handleSaveMemoryMessages(deps, {
      ...body,
      agentId: body?.agentId ?? query.agentId,
    });
    return c.json(response, response.success ? 200 : (response.httpStatus ?? 500));
  });

  app.post(MEMORY_ROUTES.createConversation.path, async (c) => {
    const query = c.req.query();
    let body: any;
    try {
      body = await c.req.json();
    } catch (error) {
      logger.warn("Invalid JSON body for create conversation", { error });
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }
    logger.trace("POST /api/memory/conversations - creating conversation");
    const response = await handleCreateMemoryConversation(deps, {
      ...body,
      agentId: body?.agentId ?? query.agentId,
    });
    return c.json(response, response.success ? 200 : (response.httpStatus ?? 500));
  });

  app.patch(MEMORY_ROUTES.updateConversation.path, async (c) => {
    const conversationId = c.req.param("conversationId");
    const query = c.req.query();
    let body: any;
    try {
      body = await c.req.json();
    } catch (error) {
      logger.warn("Invalid JSON body for update conversation", { error, conversationId });
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }
    logger.trace(`PATCH /api/memory/conversations/${conversationId} - updating conversation`);
    const response = await handleUpdateMemoryConversation(deps, conversationId, {
      ...body,
      agentId: body?.agentId ?? query.agentId,
    });
    return c.json(response, response.success ? 200 : (response.httpStatus ?? 500));
  });

  app.delete(MEMORY_ROUTES.deleteConversation.path, async (c) => {
    const conversationId = c.req.param("conversationId");
    const query = c.req.query();
    logger.trace(`DELETE /api/memory/conversations/${conversationId} - deleting conversation`);
    const response = await handleDeleteMemoryConversation(deps, conversationId, {
      agentId: query.agentId,
    });
    return c.json(response, response.success ? 200 : (response.httpStatus ?? 500));
  });

  app.post(MEMORY_ROUTES.cloneConversation.path, async (c) => {
    const conversationId = c.req.param("conversationId");
    const query = c.req.query();
    let body: any;
    try {
      body = await c.req.json();
    } catch (error) {
      logger.warn("Invalid JSON body for clone conversation", { error, conversationId });
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }
    logger.trace(`POST /api/memory/conversations/${conversationId}/clone - cloning conversation`);
    const response = await handleCloneMemoryConversation(deps, conversationId, {
      ...body,
      agentId: body?.agentId ?? query.agentId,
    });
    return c.json(response, response.success ? 200 : (response.httpStatus ?? 500));
  });

  app.post(MEMORY_ROUTES.updateWorkingMemory.path, async (c) => {
    const conversationId = c.req.param("conversationId");
    const query = c.req.query();
    let body: any;
    try {
      body = await c.req.json();
    } catch (error) {
      logger.warn("Invalid JSON body for update working memory", { error, conversationId });
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }
    logger.trace(
      `POST /api/memory/conversations/${conversationId}/working-memory - updating working memory`,
    );
    const response = await handleUpdateMemoryWorkingMemory(deps, conversationId, {
      ...body,
      agentId: body?.agentId ?? query.agentId,
    });
    return c.json(response, response.success ? 200 : (response.httpStatus ?? 500));
  });

  app.post(MEMORY_ROUTES.deleteMessages.path, async (c) => {
    const query = c.req.query();
    let body: any;
    try {
      body = await c.req.json();
    } catch (error) {
      logger.warn("Invalid JSON body for delete messages", { error });
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }
    logger.trace("POST /api/memory/messages/delete - deleting messages");
    const response = await handleDeleteMemoryMessages(deps, {
      ...body,
      agentId: body?.agentId ?? query.agentId,
    });
    return c.json(response, response.success ? 200 : (response.httpStatus ?? 500));
  });

  app.get(MEMORY_ROUTES.searchMemory.path, async (c) => {
    const query = c.req.query();
    logger.trace("GET /api/memory/search - searching memory", { query });
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

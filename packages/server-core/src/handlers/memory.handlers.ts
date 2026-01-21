import {
  AgentRegistry,
  type Conversation,
  ConversationAlreadyExistsError,
  ConversationNotFoundError,
  EmbeddingAdapterNotConfiguredError,
  type Memory,
  type ServerProviderDeps,
  VectorAdapterNotConfiguredError,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal";
import { type UIMessage, generateId } from "ai";
import type { ApiResponse } from "../types";

type MemoryResolution =
  | {
      ok: true;
      memory: Memory;
      agentId?: string;
      agentName?: string;
      resourceId?: string;
    }
  | {
      ok: false;
      error: string;
      httpStatus?: number;
    };

function resolveMemory(
  deps: { agentRegistry: ServerProviderDeps["agentRegistry"] },
  agentId?: string,
): MemoryResolution {
  if (agentId) {
    const agent = deps.agentRegistry.getAgent(agentId);
    if (!agent) {
      return {
        ok: false,
        error: `Agent ${agentId} not found`,
        httpStatus: 404,
      };
    }

    const memory = agent.getMemory();
    if (!memory) {
      return {
        ok: false,
        error: `Memory not configured for agent ${agentId}`,
        httpStatus: 400,
      };
    }

    const state = agent.getFullState();
    return {
      ok: true,
      memory,
      agentId: state.id,
      agentName: state.name,
      resourceId: state.id,
    };
  }

  const registry = AgentRegistry.getInstance();
  const globalMemory = registry.getGlobalMemory();
  if (globalMemory) {
    return { ok: true, memory: globalMemory };
  }

  const agents = deps.agentRegistry.getAllAgents();
  const agentsWithMemory = agents.filter((agent) => {
    const memory = agent.getMemory();
    return typeof memory === "object" && memory !== null;
  });

  if (agentsWithMemory.length === 1) {
    const agent = agentsWithMemory[0];
    const memory = agent.getMemory() as Memory;
    const state = agent.getFullState();
    return {
      ok: true,
      memory,
      agentId: state.id,
      agentName: state.name,
      resourceId: state.id,
    };
  }

  if (agentsWithMemory.length > 1) {
    return {
      ok: false,
      error: "agentId is required when multiple agents are configured",
      httpStatus: 400,
    };
  }

  return {
    ok: false,
    error: "Memory not configured",
    httpStatus: 400,
  };
}

function buildErrorResponse(error: unknown): ApiResponse {
  return {
    success: false,
    error: error instanceof Error ? error.message : safeStringify(error),
  };
}

export async function handleListMemoryConversations(
  deps: ServerProviderDeps,
  query: {
    agentId?: string;
    resourceId?: string;
    userId?: string;
    limit?: number;
    offset?: number;
    orderBy?: "created_at" | "updated_at" | "title";
    orderDirection?: "ASC" | "DESC";
  },
): Promise<
  ApiResponse<{ conversations: Conversation[]; total: number; limit: number; offset: number }>
> {
  try {
    const resolved = resolveMemory(deps, query.agentId);
    if (!resolved.ok) {
      return {
        success: false,
        error: resolved.error,
        httpStatus: resolved.httpStatus,
      };
    }

    const resourceId = query.resourceId ?? resolved.resourceId;
    const [conversations, total] = await Promise.all([
      resolved.memory.queryConversations({
        userId: query.userId,
        resourceId,
        limit: query.limit,
        offset: query.offset,
        orderBy: query.orderBy,
        orderDirection: query.orderDirection,
      }),
      resolved.memory.countConversations({
        userId: query.userId,
        resourceId,
      }),
    ]);

    return {
      success: true,
      data: {
        conversations,
        total,
        limit: query.limit ?? conversations.length,
        offset: query.offset ?? 0,
      },
    };
  } catch (error) {
    return buildErrorResponse(error);
  }
}

export async function handleGetMemoryConversation(
  deps: ServerProviderDeps,
  conversationId: string,
  query: { agentId?: string },
): Promise<ApiResponse<{ conversation: Conversation }>> {
  try {
    const resolved = resolveMemory(deps, query.agentId);
    if (!resolved.ok) {
      return {
        success: false,
        error: resolved.error,
        httpStatus: resolved.httpStatus,
      };
    }

    const conversation = await resolved.memory.getConversation(conversationId);
    if (!conversation) {
      return {
        success: false,
        error: "Conversation not found",
        httpStatus: 404,
      };
    }

    return {
      success: true,
      data: { conversation },
    };
  } catch (error) {
    return buildErrorResponse(error);
  }
}

export async function handleListMemoryConversationMessages(
  deps: ServerProviderDeps,
  conversationId: string,
  query: {
    agentId?: string;
    limit?: number;
    before?: Date;
    after?: Date;
    roles?: string[];
    userId?: string;
  },
): Promise<ApiResponse<{ conversation: Conversation; messages: UIMessage[] }>> {
  try {
    const resolved = resolveMemory(deps, query.agentId);
    if (!resolved.ok) {
      return {
        success: false,
        error: resolved.error,
        httpStatus: resolved.httpStatus,
      };
    }

    const conversation = await resolved.memory.getConversation(conversationId);
    if (!conversation) {
      return {
        success: false,
        error: "Conversation not found",
        httpStatus: 404,
      };
    }

    const userId = query.userId ?? conversation.userId;
    const messages = await resolved.memory.getMessages(userId, conversationId, {
      limit: query.limit,
      before: query.before,
      after: query.after,
      roles: query.roles,
    });

    return {
      success: true,
      data: { conversation, messages },
    };
  } catch (error) {
    return buildErrorResponse(error);
  }
}

export async function handleGetMemoryWorkingMemory(
  deps: ServerProviderDeps,
  conversationId: string,
  query: { agentId?: string; scope?: "conversation" | "user"; userId?: string },
): Promise<
  ApiResponse<{
    content: string | null;
    format: "markdown" | "json" | null;
    template: string | null;
    scope: "conversation" | "user";
  }>
> {
  try {
    const resolved = resolveMemory(deps, query.agentId);
    if (!resolved.ok) {
      return {
        success: false,
        error: resolved.error,
        httpStatus: resolved.httpStatus,
      };
    }

    const scope = query.scope === "user" ? "user" : "conversation";
    let content: string | null = null;
    let userId = query.userId;

    if (scope === "conversation") {
      const conversation = await resolved.memory.getConversation(conversationId);
      if (!conversation) {
        return {
          success: false,
          error: "Conversation not found",
          httpStatus: 404,
        };
      }

      userId = userId ?? conversation.userId;
      content = await resolved.memory.getWorkingMemory({
        conversationId,
        userId,
      });
    } else {
      if (!userId) {
        return {
          success: false,
          error: "userId is required for user-scoped working memory",
          httpStatus: 400,
        };
      }

      content = await resolved.memory.getWorkingMemory({
        userId,
      });
    }

    if (content === null) {
      return {
        success: false,
        error: "Working memory not found",
        httpStatus: 404,
      };
    }

    return {
      success: true,
      data: {
        content,
        scope,
        format: resolved.memory.getWorkingMemoryFormat?.() ?? null,
        template: resolved.memory.getWorkingMemoryTemplate?.() ?? null,
      },
    };
  } catch (error) {
    return buildErrorResponse(error);
  }
}

type SaveMessageEntry =
  | (UIMessage & { userId?: string; conversationId?: string })
  | { message: UIMessage; userId?: string; conversationId?: string };

export async function handleSaveMemoryMessages(
  deps: ServerProviderDeps,
  body: {
    agentId?: string;
    userId?: string;
    conversationId?: string;
    messages?: SaveMessageEntry[];
  },
): Promise<ApiResponse<{ saved: number }>> {
  try {
    const resolved = resolveMemory(deps, body.agentId);
    if (!resolved.ok) {
      return {
        success: false,
        error: resolved.error,
        httpStatus: resolved.httpStatus,
      };
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return {
        success: false,
        error: "messages array is required",
        httpStatus: 400,
      };
    }

    const normalized = body.messages.map((entry) => {
      const isWrapped = typeof entry === "object" && entry !== null && "message" in entry;
      const message = isWrapped ? entry.message : (entry as UIMessage);
      const conversationId =
        (isWrapped ? entry.conversationId : entry.conversationId) ?? body.conversationId;
      const userId = (isWrapped ? entry.userId : entry.userId) ?? body.userId;

      return {
        message: {
          ...message,
          id: message.id || generateId(),
        },
        conversationId,
        userId,
      };
    });

    const missing = normalized.filter((item) => !item.conversationId || !item.userId);
    if (missing.length > 0) {
      return {
        success: false,
        error: "Each message must include conversationId and userId",
        httpStatus: 400,
      };
    }

    const conversationCache = new Map<string, Conversation>();
    for (const item of normalized) {
      const conversationId = item.conversationId as string;
      if (!conversationCache.has(conversationId)) {
        const conversation = await resolved.memory.getConversation(conversationId);
        if (!conversation) {
          return {
            success: false,
            error: `Conversation not found: ${conversationId}`,
            httpStatus: 404,
          };
        }
        conversationCache.set(conversationId, conversation);
      }
    }

    for (const item of normalized) {
      const conversation = conversationCache.get(item.conversationId as string);
      if (conversation && conversation.userId !== item.userId) {
        return {
          success: false,
          error: `userId does not match conversation ${conversation.id}`,
          httpStatus: 400,
        };
      }
    }

    const grouped = new Map<
      string,
      { userId: string; conversationId: string; messages: UIMessage[] }
    >();
    for (const item of normalized) {
      const conversationId = item.conversationId as string;
      const userId = item.userId as string;
      const key = `${userId}:${conversationId}`;
      const entry = grouped.get(key) || { userId, conversationId, messages: [] };
      entry.messages.push(item.message);
      grouped.set(key, entry);
    }

    for (const entry of grouped.values()) {
      await resolved.memory.addMessages(entry.messages, entry.userId, entry.conversationId);
    }

    return {
      success: true,
      data: { saved: normalized.length },
    };
  } catch (error) {
    return buildErrorResponse(error);
  }
}

export async function handleCreateMemoryConversation(
  deps: ServerProviderDeps,
  body: {
    agentId?: string;
    conversationId?: string;
    resourceId?: string;
    userId?: string;
    title?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<ApiResponse<{ conversation: Conversation }>> {
  try {
    const resolved = resolveMemory(deps, body.agentId);
    if (!resolved.ok) {
      return {
        success: false,
        error: resolved.error,
        httpStatus: resolved.httpStatus,
      };
    }

    if (!body.userId) {
      return {
        success: false,
        error: "userId is required",
        httpStatus: 400,
      };
    }

    const resourceId = body.resourceId ?? resolved.resourceId;
    if (!resourceId) {
      return {
        success: false,
        error: "resourceId is required",
        httpStatus: 400,
      };
    }

    const conversationId = body.conversationId ?? generateId();
    const conversation = await resolved.memory.createConversation({
      id: conversationId,
      resourceId,
      userId: body.userId,
      title: body.title ?? "",
      metadata: body.metadata ?? {},
    });

    return {
      success: true,
      data: { conversation },
    };
  } catch (error) {
    if (error instanceof ConversationAlreadyExistsError) {
      return {
        success: false,
        error: error.message,
        httpStatus: 409,
      };
    }
    return buildErrorResponse(error);
  }
}

export async function handleUpdateMemoryConversation(
  deps: ServerProviderDeps,
  conversationId: string,
  body: {
    agentId?: string;
    resourceId?: string;
    userId?: string;
    title?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<ApiResponse<{ conversation: Conversation }>> {
  try {
    const resolved = resolveMemory(deps, body.agentId);
    if (!resolved.ok) {
      return {
        success: false,
        error: resolved.error,
        httpStatus: resolved.httpStatus,
      };
    }

    const updates: Partial<Omit<Conversation, "id" | "createdAt" | "updatedAt">> = {};
    if (body.resourceId !== undefined) {
      updates.resourceId = body.resourceId;
    }
    if (body.userId !== undefined) {
      updates.userId = body.userId;
    }
    if (body.title !== undefined) {
      updates.title = body.title;
    }
    if (body.metadata !== undefined) {
      updates.metadata = body.metadata;
    }

    if (Object.keys(updates).length === 0) {
      return {
        success: false,
        error: "No updates provided",
        httpStatus: 400,
      };
    }

    const conversation = await resolved.memory.updateConversation(conversationId, updates);
    return {
      success: true,
      data: { conversation },
    };
  } catch (error) {
    if (error instanceof ConversationNotFoundError) {
      return {
        success: false,
        error: error.message,
        httpStatus: 404,
      };
    }
    return buildErrorResponse(error);
  }
}

export async function handleDeleteMemoryConversation(
  deps: ServerProviderDeps,
  conversationId: string,
  query: { agentId?: string },
): Promise<ApiResponse<{ deleted: boolean }>> {
  try {
    const resolved = resolveMemory(deps, query.agentId);
    if (!resolved.ok) {
      return {
        success: false,
        error: resolved.error,
        httpStatus: resolved.httpStatus,
      };
    }

    await resolved.memory.deleteConversation(conversationId);
    return {
      success: true,
      data: { deleted: true },
    };
  } catch (error) {
    if (error instanceof ConversationNotFoundError) {
      return {
        success: false,
        error: error.message,
        httpStatus: 404,
      };
    }
    return buildErrorResponse(error);
  }
}

export async function handleCloneMemoryConversation(
  deps: ServerProviderDeps,
  conversationId: string,
  body: {
    agentId?: string;
    newConversationId?: string;
    resourceId?: string;
    userId?: string;
    title?: string;
    metadata?: Record<string, unknown>;
    includeMessages?: boolean;
  },
): Promise<ApiResponse<{ conversation: Conversation; messageCount: number }>> {
  try {
    const resolved = resolveMemory(deps, body.agentId);
    if (!resolved.ok) {
      return {
        success: false,
        error: resolved.error,
        httpStatus: resolved.httpStatus,
      };
    }

    const source = await resolved.memory.getConversation(conversationId);
    if (!source) {
      return {
        success: false,
        error: "Conversation not found",
        httpStatus: 404,
      };
    }

    const clonedId = body.newConversationId ?? generateId();
    const conversation = await resolved.memory.createConversation({
      id: clonedId,
      resourceId: body.resourceId ?? source.resourceId,
      userId: body.userId ?? source.userId,
      title: body.title ?? source.title,
      metadata: body.metadata ?? source.metadata,
    });

    let messageCount = 0;
    const includeMessages = body.includeMessages !== false;
    if (includeMessages) {
      const messages = await resolved.memory.getMessages(source.userId, conversationId);
      if (messages.length > 0) {
        await resolved.memory.addMessages(messages, conversation.userId, conversation.id);
        messageCount = messages.length;
      }
    }

    return {
      success: true,
      data: { conversation, messageCount },
    };
  } catch (error) {
    if (error instanceof ConversationAlreadyExistsError) {
      return {
        success: false,
        error: error.message,
        httpStatus: 409,
      };
    }
    return buildErrorResponse(error);
  }
}

export async function handleUpdateMemoryWorkingMemory(
  deps: ServerProviderDeps,
  conversationId: string,
  body: {
    agentId?: string;
    userId?: string;
    content?: string | Record<string, unknown>;
    mode?: "replace" | "append";
  },
): Promise<ApiResponse<{ updated: boolean }>> {
  try {
    const resolved = resolveMemory(deps, body.agentId);
    if (!resolved.ok) {
      return {
        success: false,
        error: resolved.error,
        httpStatus: resolved.httpStatus,
      };
    }

    if (body.content === undefined) {
      return {
        success: false,
        error: "content is required",
        httpStatus: 400,
      };
    }

    const conversation = await resolved.memory.getConversation(conversationId);
    if (!conversation) {
      return {
        success: false,
        error: "Conversation not found",
        httpStatus: 404,
      };
    }

    const userId = body.userId ?? conversation.userId;
    if (body.userId && body.userId !== conversation.userId) {
      return {
        success: false,
        error: `userId does not match conversation ${conversation.id}`,
        httpStatus: 400,
      };
    }
    await resolved.memory.updateWorkingMemory({
      conversationId,
      userId,
      content: body.content,
      options: body.mode ? { mode: body.mode } : undefined,
    });

    return {
      success: true,
      data: { updated: true },
    };
  } catch (error) {
    return buildErrorResponse(error);
  }
}

export async function handleDeleteMemoryMessages(
  deps: ServerProviderDeps,
  body: {
    agentId?: string;
    conversationId?: string;
    userId?: string;
    messageIds?: string[];
  },
): Promise<ApiResponse<{ deleted: number }>> {
  try {
    const resolved = resolveMemory(deps, body.agentId);
    if (!resolved.ok) {
      return {
        success: false,
        error: resolved.error,
        httpStatus: resolved.httpStatus,
      };
    }

    if (!Array.isArray(body.messageIds) || body.messageIds.length === 0) {
      return {
        success: false,
        error: "messageIds array is required",
        httpStatus: 400,
      };
    }

    if (!body.conversationId || !body.userId) {
      return {
        success: false,
        error: "conversationId and userId are required",
        httpStatus: 400,
      };
    }

    const conversation = await resolved.memory.getConversation(body.conversationId);
    if (!conversation) {
      return {
        success: false,
        error: "Conversation not found",
        httpStatus: 404,
      };
    }
    if (conversation.userId !== body.userId) {
      return {
        success: false,
        error: `userId does not match conversation ${conversation.id}`,
        httpStatus: 400,
      };
    }

    const messages = await resolved.memory.getMessages(body.userId, body.conversationId);
    const idsToDelete = new Set(body.messageIds);
    const deleted = messages.filter((message) => idsToDelete.has(message.id)).length;
    await resolved.memory.deleteMessages(body.messageIds, body.userId, body.conversationId);
    return {
      success: true,
      data: { deleted },
    };
  } catch (error) {
    return buildErrorResponse(error);
  }
}

export async function handleSearchMemory(
  deps: ServerProviderDeps,
  query: {
    agentId?: string;
    searchQuery?: string;
    limit?: number;
    threshold?: number;
    conversationId?: string;
    userId?: string;
  },
): Promise<ApiResponse<{ results: unknown[]; count: number; query: string }>> {
  try {
    if (!query.searchQuery) {
      return {
        success: false,
        error: "searchQuery is required",
        httpStatus: 400,
      };
    }

    const resolved = resolveMemory(deps, query.agentId);
    if (!resolved.ok) {
      return {
        success: false,
        error: resolved.error,
        httpStatus: resolved.httpStatus,
      };
    }

    const filter: Record<string, unknown> = {};
    if (query.conversationId) {
      filter.conversationId = query.conversationId;
    }
    if (query.userId) {
      filter.userId = query.userId;
    }

    const results = await resolved.memory.searchSimilar(query.searchQuery, {
      limit: query.limit,
      threshold: query.threshold,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    });

    return {
      success: true,
      data: {
        results,
        count: results.length,
        query: query.searchQuery,
      },
    };
  } catch (error) {
    if (
      error instanceof EmbeddingAdapterNotConfiguredError ||
      error instanceof VectorAdapterNotConfiguredError
    ) {
      return {
        success: false,
        error: error.message,
        httpStatus: 400,
      };
    }
    return buildErrorResponse(error);
  }
}

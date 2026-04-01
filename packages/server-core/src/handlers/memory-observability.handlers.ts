import type { ServerProviderDeps } from "@voltagent/core";
import type { Agent, Memory } from "@voltagent/core";
import { safeStringify } from "@voltagent/internal";
import type {
  MemoryConversationMessagesResult,
  MemoryConversationStepsResult,
  MemoryConversationSummary,
  MemoryGetMessagesQuery,
  MemoryGetStepsQuery,
  MemoryListConversationsQuery,
  MemoryListUsersQuery,
  MemoryUserSummary,
  MemoryWorkingMemoryResult,
} from "../types/observability-memory";
import type { ApiResponse } from "../types/responses";

interface AgentMemoryContext {
  agentId: string;
  agentName?: string;
  agent: Agent;
  memory: Memory;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function clampLimit(value?: number): number {
  if (!value || Number.isNaN(value)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.max(1, value), MAX_LIMIT);
}

function normalizeOffset(value?: number): number {
  if (!value || Number.isNaN(value) || value < 0) {
    return 0;
  }
  return value;
}

function getAgentsWithMemory(
  deps: ServerProviderDeps,
  targetAgentId?: string,
): AgentMemoryContext[] {
  const agents = deps.agentRegistry.getAllAgents();

  return agents
    .filter((agent) => {
      if (targetAgentId && agent.getFullState().id !== targetAgentId) {
        return false;
      }
      const memory = agent.getMemory();
      return (
        typeof memory === "object" &&
        memory !== null &&
        typeof (memory as Memory).queryConversations === "function"
      );
    })
    .map((agent) => {
      const state = agent.getFullState();
      return {
        agent,
        agentId: state.id,
        agentName: state.name,
        memory: agent.getMemory() as Memory,
      };
    });
}

function sortConversations(
  conversations: MemoryConversationSummary[],
  orderBy: string,
  direction: "ASC" | "DESC",
) {
  const multiplier = direction === "ASC" ? 1 : -1;

  conversations.sort((a, b) => {
    if (orderBy === "title") {
      return a.title.localeCompare(b.title) * multiplier;
    }
    if (orderBy === "created_at") {
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * multiplier;
    }
    return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * multiplier;
  });
}

export async function listMemoryUsersHandler(
  deps: ServerProviderDeps,
  query: MemoryListUsersQuery,
): Promise<
  ApiResponse<{ users: MemoryUserSummary[]; total: number; limit: number; offset: number }>
> {
  try {
    const limit = clampLimit(query.limit);
    const offset = normalizeOffset(query.offset);
    const agents = getAgentsWithMemory(deps, query.agentId);

    if (agents.length === 0) {
      return {
        success: true,
        data: { users: [], total: 0, limit, offset },
      };
    }

    const userMap = new Map<string, MemoryUserSummary>();

    for (const { agentId, agentName, memory } of agents) {
      // Fetch all conversations for this agent; currently no native distinct-user query
      // TODO: optimize via storage-level user listing
      const conversations: any[] = await memory.queryConversations({ resourceId: agentId });

      for (const conversation of conversations) {
        if (!conversation?.userId) {
          continue;
        }

        const userId = conversation.userId as string;
        const lastInteractionAt = conversation.updatedAt as string;
        let summary = userMap.get(userId);

        if (!summary) {
          summary = {
            userId,
            conversationCount: 0,
            agents: [],
            lastInteractionAt,
          };
          userMap.set(userId, summary);
        }

        summary.conversationCount += 1;
        if (
          !summary.lastInteractionAt ||
          new Date(lastInteractionAt).getTime() > new Date(summary.lastInteractionAt).getTime()
        ) {
          summary.lastInteractionAt = lastInteractionAt;
        }

        let agentSummary = summary.agents.find((item) => item.agentId === agentId);
        if (!agentSummary) {
          agentSummary = {
            agentId,
            agentName,
            conversationCount: 0,
            lastInteractionAt,
          };
          summary.agents.push(agentSummary);
        }

        agentSummary.conversationCount += 1;
        if (
          !agentSummary.lastInteractionAt ||
          new Date(lastInteractionAt).getTime() > new Date(agentSummary.lastInteractionAt).getTime()
        ) {
          agentSummary.lastInteractionAt = lastInteractionAt;
        }
      }
    }

    let users = Array.from(userMap.values());

    if (query.search) {
      const term = query.search.toLowerCase();
      users = users.filter((item) => item.userId.toLowerCase().includes(term));
    }

    users.sort((a, b) => {
      const aTime = a.lastInteractionAt ? new Date(a.lastInteractionAt).getTime() : 0;
      const bTime = b.lastInteractionAt ? new Date(b.lastInteractionAt).getTime() : 0;
      return bTime - aTime;
    });

    const total = users.length;
    const paginated = users.slice(offset, offset + limit);

    return {
      success: true,
      data: {
        users: paginated,
        total,
        limit,
        offset,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : safeStringify(error),
    };
  }
}

export async function listMemoryConversationsHandler(
  deps: ServerProviderDeps,
  query: MemoryListConversationsQuery,
): Promise<
  ApiResponse<{
    conversations: MemoryConversationSummary[];
    total: number;
    limit: number;
    offset: number;
  }>
> {
  try {
    const limit = clampLimit(query.limit);
    const offset = normalizeOffset(query.offset);
    const orderBy = query.orderBy || "updated_at";
    const orderDirection = query.orderDirection || "DESC";

    const agents = getAgentsWithMemory(deps, query.agentId);

    if (agents.length === 0) {
      return {
        success: true,
        data: { conversations: [], total: 0, limit, offset },
      };
    }

    const conversations: MemoryConversationSummary[] = [];

    for (const { agentId, agentName, memory } of agents) {
      const convList: any[] = await memory.queryConversations({
        resourceId: agentId,
        userId: query.userId,
        orderBy,
        orderDirection,
      });

      for (const conv of convList) {
        const summary: MemoryConversationSummary = {
          id: conv.id,
          userId: conv.userId,
          agentId,
          agentName,
          title: conv.title,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          metadata: conv.metadata,
        };

        conversations.push(summary);
      }
    }

    sortConversations(conversations, orderBy, orderDirection);

    const total = conversations.length;
    const paginated = conversations.slice(offset, offset + limit);

    return {
      success: true,
      data: {
        conversations: paginated,
        total,
        limit,
        offset,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : safeStringify(error),
    };
  }
}

export async function getConversationMessagesHandler(
  deps: ServerProviderDeps,
  conversationId: string,
  query: MemoryGetMessagesQuery,
): Promise<ApiResponse<MemoryConversationMessagesResult>> {
  try {
    const agents = getAgentsWithMemory(deps, query.agentId);

    if (agents.length === 0) {
      return {
        success: false,
        error: "Conversation not found",
      };
    }

    for (const { agentId, agentName, memory } of agents) {
      const conversation = await memory.getConversation(conversationId);
      if (!conversation) {
        continue;
      }

      const messages = await memory.getMessages(conversation.userId, conversationId, {
        limit: query.limit ? clampLimit(query.limit) : undefined,
        before: query.before,
        after: query.after,
        roles: query.roles,
      });

      const result: MemoryConversationMessagesResult = {
        conversation: {
          id: conversation.id,
          userId: conversation.userId,
          agentId,
          agentName,
          title: conversation.title,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          metadata: conversation.metadata,
        },
        messages,
      };

      return {
        success: true,
        data: result,
      };
    }

    return {
      success: false,
      error: "Conversation not found",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : safeStringify(error),
    };
  }
}

export async function getConversationStepsHandler(
  deps: ServerProviderDeps,
  conversationId: string,
  query: MemoryGetStepsQuery,
): Promise<ApiResponse<MemoryConversationStepsResult>> {
  try {
    const agents = getAgentsWithMemory(deps, query.agentId);

    if (agents.length === 0) {
      return {
        success: false,
        error: "Conversation not found",
      };
    }

    for (const { agentId, agentName, memory } of agents) {
      const conversation = await memory.getConversation(conversationId);
      if (!conversation) {
        continue;
      }

      const memoryWithSteps = memory as Memory & {
        getConversationSteps?: (
          userId: string,
          conversationId: string,
          options?: MemoryGetStepsQuery,
        ) => Promise<any>;
      };

      if (typeof memoryWithSteps.getConversationSteps !== "function") {
        return {
          success: false,
          error: "Conversation steps are not supported by this memory adapter.",
        };
      }

      const steps = await memoryWithSteps.getConversationSteps(
        conversation.userId,
        conversationId,
        {
          limit: query.limit ? clampLimit(query.limit) : undefined,
          operationId: query.operationId,
        },
      );

      return {
        success: true,
        data: {
          conversation: {
            id: conversation.id,
            userId: conversation.userId,
            agentId,
            agentName,
            title: conversation.title,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
            metadata: conversation.metadata,
          },
          steps,
        },
      };
    }

    return {
      success: false,
      error: "Conversation not found",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : safeStringify(error),
    };
  }
}

export async function getWorkingMemoryHandler(
  deps: ServerProviderDeps,
  params: {
    agentId?: string;
    conversationId?: string;
    userId?: string;
    scope: "conversation" | "user";
  },
): Promise<ApiResponse<MemoryWorkingMemoryResult>> {
  try {
    const agents = getAgentsWithMemory(deps, params.agentId);

    if (agents.length === 0) {
      if (params.scope === "user" && params.userId) {
        return {
          success: true,
          data: {
            agentId: null,
            agentName: null,
            scope: "user",
            content: null,
            format: null,
            template: null,
          },
        };
      }

      return {
        success: false,
        error: "Working memory not found",
      };
    }

    for (const { agentId, agentName, memory } of agents) {
      if (params.scope === "conversation" && params.conversationId) {
        const conversation = await memory.getConversation(params.conversationId);
        if (!conversation) {
          continue;
        }

        const content = await memory.getWorkingMemory({
          conversationId: params.conversationId,
          userId: conversation.userId,
        });

        return {
          success: true,
          data: {
            agentId,
            agentName,
            scope: "conversation",
            content,
            format: memory.getWorkingMemoryFormat?.() ?? null,
            template: memory.getWorkingMemoryTemplate?.() ?? null,
          },
        };
      }

      if (params.scope === "user" && params.userId) {
        const content = await memory.getWorkingMemory({
          userId: params.userId,
        });

        if (content !== null) {
          return {
            success: true,
            data: {
              agentId,
              agentName,
              scope: "user",
              content,
              format: memory.getWorkingMemoryFormat?.() ?? null,
              template: memory.getWorkingMemoryTemplate?.() ?? null,
            },
          };
        }
      }
    }

    if (params.scope === "user" && params.userId) {
      const fallbackAgent = agents[0];
      return {
        success: true,
        data: {
          agentId: fallbackAgent ? fallbackAgent.agentId : null,
          agentName: fallbackAgent ? fallbackAgent.agentName : null,
          scope: "user",
          content: null,
          format: null,
          template: null,
        },
      };
    }

    return {
      success: false,
      error: "Working memory not found",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : safeStringify(error),
    };
  }
}

import type { ConversationStepRecord } from "@voltagent/core";
import type { UIMessage } from "ai";

export interface MemoryUserSummary {
  userId: string;
  conversationCount: number;
  agents: MemoryUserAgentSummary[];
  lastInteractionAt?: string;
}

export interface MemoryUserAgentSummary {
  agentId: string;
  agentName?: string;
  conversationCount: number;
  lastInteractionAt?: string;
}

export interface MemoryConversationSummary {
  id: string;
  userId: string;
  agentId: string;
  agentName?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface MemoryConversationMessagesResult {
  conversation: MemoryConversationSummary;
  messages: UIMessage[];
}

export interface MemoryConversationStepsResult {
  conversation: MemoryConversationSummary;
  steps: ConversationStepRecord[];
}

export interface MemoryWorkingMemoryResult {
  agentId: string | null;
  agentName?: string | null;
  scope: "conversation" | "user";
  content: string | null;
  format: "markdown" | "json" | null;
  template?: string | null;
}

export interface MemoryListUsersQuery {
  agentId?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

export interface MemoryListConversationsQuery {
  agentId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
  orderBy?: "created_at" | "updated_at" | "title";
  orderDirection?: "ASC" | "DESC";
}

export interface MemoryGetMessagesQuery {
  agentId?: string;
  limit?: number;
  before?: Date;
  after?: Date;
  roles?: string[];
}

export interface MemoryGetStepsQuery {
  agentId?: string;
  limit?: number;
  operationId?: string;
}

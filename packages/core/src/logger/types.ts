import type { Logger } from "@voltagent/logger";

export interface AgentLoggerContext {
  agentId: string;
  agentName?: string;
  conversationId?: string;
  userId?: string;
  modelName?: string;
}

export interface WorkflowLoggerContext {
  workflowId: string;
  workflowName?: string;
  executionId?: string;
  stepId?: string;
  stepType?: string;
  conversationId?: string;
  userId?: string;
}

export interface ToolLoggerContext {
  toolName: string;
  executionId: string;
  agentId?: string;
  conversationId?: string;
  userId?: string;
  duration?: number;
  success?: boolean;
}

export interface MemoryLoggerContext {
  memoryType: string;
  operation: "read" | "write" | "delete" | "clear";
  agentId?: string;
  conversationId?: string;
  userId?: string;
  recordCount?: number;
}

export interface MCPLoggerContext {
  serverName: string;
  transport: string;
  method?: string;
  requestId?: string;
}

export interface VoltAgentLoggerOptions {
  logger?: Logger;
}

export interface AgentLoggerOptions extends VoltAgentLoggerOptions {
  context?: Partial<AgentLoggerContext>;
}

export interface WorkflowLoggerOptions extends VoltAgentLoggerOptions {
  context?: Partial<WorkflowLoggerContext>;
}

import type { Logger } from "./types";

/**
 * Create a child logger with component context
 */
export function createComponentLogger(
  parentLogger: Logger,
  component: string,
  additionalContext?: Record<string, any>,
): Logger {
  return parentLogger.child({
    component,
    ...additionalContext,
  });
}

/**
 * Create a child logger with request/conversation context
 */
export function createRequestLogger(
  parentLogger: Logger,
  context: {
    conversationId?: string;
    userId?: string;
    requestId?: string;
    [key: string]: any;
  },
): Logger {
  return parentLogger.child(context);
}

/**
 * Create a child logger with agent context
 */
export function createAgentContextLogger(
  parentLogger: Logger,
  context: {
    agentId: string;
    agentName?: string;
    conversationId?: string;
    userId?: string;
    modelName?: string;
    [key: string]: any;
  },
): Logger {
  return parentLogger.child({
    component: `Agent:${context.agentName || context.agentId}`,
    ...context,
  });
}

/**
 * Create a child logger with workflow context
 */
export function createWorkflowContextLogger(
  parentLogger: Logger,
  context: {
    workflowId: string;
    workflowName?: string;
    executionId: string;
    stepId?: string;
    stepType?: string;
    [key: string]: any;
  },
): Logger {
  return parentLogger.child({
    component: `Workflow:${context.workflowName || context.workflowId}`,
    ...context,
  });
}

/**
 * Create a child logger with tool context
 */
export function createToolContextLogger(
  parentLogger: Logger,
  context: {
    toolName: string;
    executionId: string;
    agentId?: string;
    conversationId?: string;
    [key: string]: any;
  },
): Logger {
  return parentLogger.child({
    component: `Tool:${context.toolName}`,
    ...context,
  });
}

/**
 * Create a child logger with memory operation context
 */
export function createMemoryContextLogger(
  parentLogger: Logger,
  context: {
    memoryType: string;
    operation: string;
    agentId?: string;
    conversationId?: string;
    [key: string]: any;
  },
): Logger {
  return parentLogger.child({
    component: `Memory:${context.memoryType}`,
    ...context,
  });
}

/**
 * Create a child logger with MCP context
 */
export function createMCPContextLogger(
  parentLogger: Logger,
  context: {
    serverName: string;
    transport: string;
    method?: string;
    [key: string]: any;
  },
): Logger {
  return parentLogger.child({
    component: `MCP:${context.serverName}`,
    ...context,
  });
}

/**
 * Semantic event names for structured logging in VoltAgent
 *
 * Event naming convention: <component>.<entity>.<action>.<status>
 *
 * Examples:
 * - agent.generation.started
 * - tool.execution.completed
 * - memory.conversation.loaded
 */

export const LogEvents = {
  // Agent events
  AGENT_GENERATION_STARTED: "agent.generation.started",
  AGENT_GENERATION_COMPLETED: "agent.generation.completed",
  AGENT_GENERATION_FAILED: "agent.generation.failed",
  AGENT_STREAM_STARTED: "agent.stream.started",
  AGENT_STREAM_COMPLETED: "agent.stream.completed",
  AGENT_STREAM_FAILED: "agent.stream.failed",
  AGENT_OBJECT_STARTED: "agent.object.started",
  AGENT_OBJECT_COMPLETED: "agent.object.completed",
  AGENT_OBJECT_FAILED: "agent.object.failed",
  AGENT_STREAM_OBJECT_STARTED: "agent.stream_object.started",
  AGENT_STREAM_OBJECT_COMPLETED: "agent.stream_object.completed",
  AGENT_STREAM_OBJECT_FAILED: "agent.stream_object.failed",
  AGENT_TOOL_INITIATED: "agent.tool.initiated",
  AGENT_CREATED: "agent.lifecycle.created",
  AGENT_STEP_TEXT: "agent.step.text",
  AGENT_STEP_TOOL_CALL: "agent.step.tool_call",
  AGENT_STEP_TOOL_RESULT: "agent.step.tool_result",

  // Tool events
  TOOL_EXECUTION_STARTED: "tool.execution.started",
  TOOL_EXECUTION_COMPLETED: "tool.execution.completed",
  TOOL_EXECUTION_FAILED: "tool.execution.failed",
  TOOL_REGISTERED: "tool.lifecycle.registered",
  TOOL_REMOVED: "tool.lifecycle.removed",

  // Memory events
  MEMORY_OPERATION_STARTED: "memory.operation.started",
  MEMORY_OPERATION_COMPLETED: "memory.operation.completed",
  MEMORY_OPERATION_FAILED: "memory.operation.failed",
  MEMORY_CONVERSATION_LOADED: "memory.conversation.loaded",
  MEMORY_CONVERSATION_SAVED: "memory.conversation.saved",

  // Workflow events
  WORKFLOW_STARTED: "workflow.execution.started",
  WORKFLOW_COMPLETED: "workflow.execution.completed",
  WORKFLOW_FAILED: "workflow.execution.failed",
  WORKFLOW_SUSPENDED: "workflow.execution.suspended",
  WORKFLOW_RESUMED: "workflow.execution.resumed",
  WORKFLOW_STEP_STARTED: "workflow.step.started",
  WORKFLOW_STEP_COMPLETED: "workflow.step.completed",
  WORKFLOW_STEP_FAILED: "workflow.step.failed",
  WORKFLOW_STEP_SKIPPED: "workflow.step.skipped",

  // MCP (Model Context Protocol) events
  MCP_CONNECTION_ESTABLISHED: "mcp.connection.established",
  MCP_CONNECTION_FAILED: "mcp.connection.failed",
  MCP_CONNECTION_CLOSED: "mcp.connection.closed",
  MCP_METHOD_CALLED: "mcp.method.called",
  MCP_METHOD_COMPLETED: "mcp.method.completed",
  MCP_METHOD_FAILED: "mcp.method.failed",

  // Event propagation
  EVENT_PROPAGATED: "event.propagation.propagated",
  EVENT_PROPAGATION_FAILED: "event.propagation.failed",
  EVENT_PROPAGATION_SKIPPED: "event.propagation.skipped",

  // API events
  API_REQUEST_RECEIVED: "api.request.received",
  API_REQUEST_COMPLETED: "api.request.completed",
  API_REQUEST_FAILED: "api.request.failed",
  API_WEBSOCKET_CONNECTED: "api.websocket.connected",
  API_WEBSOCKET_DISCONNECTED: "api.websocket.disconnected",

  // Retriever events
  RETRIEVER_SEARCH_STARTED: "retriever.search.started",
  RETRIEVER_SEARCH_COMPLETED: "retriever.search.completed",
  RETRIEVER_SEARCH_FAILED: "retriever.search.failed",
  RETRIEVER_INITIALIZED: "retriever.lifecycle.initialized",

  // VoltOps events
  VOLTOPS_CLIENT_INITIALIZED: "voltops.client.initialized",
  VOLTOPS_PROMPT_FETCH_STARTED: "voltops.prompt.fetch.started",
  VOLTOPS_PROMPT_FETCH_COMPLETED: "voltops.prompt.fetch.completed",
  VOLTOPS_PROMPT_FETCH_FAILED: "voltops.prompt.fetch.failed",
  VOLTOPS_PROMPT_CACHE_HIT: "voltops.prompt.cache.hit",
  VOLTOPS_PROMPT_CACHE_MISS: "voltops.prompt.cache.miss",
  VOLTOPS_PROMPT_CACHE_EVICTED: "voltops.prompt.cache.evicted",
  VOLTOPS_TEMPLATE_PROCESS_STARTED: "voltops.template.process.started",
  VOLTOPS_TEMPLATE_PROCESS_COMPLETED: "voltops.template.process.completed",
  VOLTOPS_TEMPLATE_PROCESS_FAILED: "voltops.template.process.failed",
} as const;

export type LogEventName = (typeof LogEvents)[keyof typeof LogEvents];

/**
 * Helper to extract component from event name
 */
export function getEventComponent(event: LogEventName): string {
  return event.split(".")[0];
}

/**
 * Helper to extract action from event name
 */
export function getEventAction(event: LogEventName): string {
  const parts = event.split(".");
  return parts.slice(1, -1).join(".");
}

/**
 * Helper to extract status from event name
 */
export function getEventStatus(event: LogEventName): string {
  const parts = event.split(".");
  return parts[parts.length - 1];
}

/**
 * Helper to check if event indicates failure
 */
export function isFailureEvent(event: LogEventName): boolean {
  return event.endsWith(".failed");
}

/**
 * Helper to check if event indicates success
 */
export function isSuccessEvent(event: LogEventName): boolean {
  return event.endsWith(".completed") || event.endsWith(".passed");
}

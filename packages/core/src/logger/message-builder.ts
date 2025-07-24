/**
 * Standardized log message builder for consistent formatting across the system
 */

export enum ResourceType {
  AGENT = "agent",
  TOOL = "tool",
  WORKFLOW = "workflow",
  MEMORY = "memory",
  RETRIEVER = "retriever",
  VOLTOPS = "voltops",
  SYSTEM = "system",
}

export enum ActionType {
  // Common actions
  START = "start",
  COMPLETE = "complete",
  ERROR = "error",

  // Agent actions
  GENERATION_START = "generationStart",
  GENERATION_COMPLETE = "generationComplete",
  STREAM_START = "streamStart",
  STREAM_COMPLETE = "streamComplete",
  STREAM_STEP = "streamStep",
  STREAMING = "streaming",
  OBJECT_GENERATION_START = "objectGenerationStart",
  OBJECT_GENERATION_COMPLETE = "objectGenerationComplete",
  STREAM_OBJECT_START = "streamObjectStart",
  STREAM_OBJECT_COMPLETE = "streamObjectComplete",
  TOOL_CALL = "toolCall",
  TOOL_ERROR = "toolError",
  DELEGATE = "delegate",

  // Tool actions
  EXECUTE = "execute",
  VALIDATE = "validate",

  // Workflow actions
  STEP_START = "stepStart",
  STEP_COMPLETE = "stepComplete",
  SUSPEND = "suspend",
  RESUME = "resume",

  // Memory actions
  ACCESS = "access",
  STORE = "store",
  RETRIEVE = "retrieve",
}

/**
 * Build a standardized log message
 * Format: [resourceType:resourceName] action - description
 */
export function buildLogMessage(
  resourceType: ResourceType,
  resourceName: string,
  action: ActionType | string,
  description: string,
): string {
  return `[${resourceType}:${resourceName}] ${action} - ${description}`;
}

/**
 * Build context object with standardized property names
 */
export function buildLogContext(
  resourceType: ResourceType,
  resourceName: string,
  action: ActionType | string,
  additionalContext?: Record<string, any>,
): Record<string, any> {
  return {
    resourceType,
    resourceName,
    action,
    ...additionalContext,
  };
}

/**
 * Helper to format agent log messages
 */
export function buildAgentLogMessage(
  agentName: string,
  action: ActionType | string,
  description: string,
): string {
  return buildLogMessage(ResourceType.AGENT, agentName, action, description);
}

/**
 * Helper to format tool log messages
 */
export function buildToolLogMessage(
  toolName: string,
  action: ActionType | string,
  description: string,
): string {
  return buildLogMessage(ResourceType.TOOL, toolName, action, description);
}

/**
 * Helper to format workflow log messages
 */
export function buildWorkflowLogMessage(
  workflowName: string,
  action: ActionType | string,
  description: string,
): string {
  return buildLogMessage(ResourceType.WORKFLOW, workflowName, action, description);
}

/**
 * Helper to format retriever log messages
 */
export function buildRetrieverLogMessage(
  retrieverName: string,
  action: ActionType | string,
  description: string,
): string {
  return buildLogMessage(ResourceType.RETRIEVER, retrieverName, action, description);
}

/**
 * Helper to format VoltOps log messages
 */
export function buildVoltOpsLogMessage(
  componentName: string,
  action: ActionType | string,
  description: string,
): string {
  return buildLogMessage(ResourceType.VOLTOPS, componentName, action, description);
}

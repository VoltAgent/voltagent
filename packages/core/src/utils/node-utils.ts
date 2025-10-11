/**
 * Node types for agents, tools, and other components
 */
export enum NodeType {
  AGENT = "agent",
  SUBAGENT = "agent",
  TOOL = "tool",
  MEMORY = "memory",
  MESSAGE = "message",
  OUTPUT = "output",
  RETRIEVER = "retriever",
  VECTOR = "vector",
  EMBEDDING = "embedding",
  SCORER = "scorer",
  // Workflow step types
  WORKFLOW_STEP = "workflow_step",
  WORKFLOW_AGENT_STEP = "workflow_agent_step",
  WORKFLOW_FUNC_STEP = "workflow_func_step",
  WORKFLOW_CONDITIONAL_STEP = "workflow_conditional_step",
  WORKFLOW_PARALLEL_ALL_STEP = "workflow_parallel_all_step",
  WORKFLOW_PARALLEL_RACE_STEP = "workflow_parallel_race_step",
}

/**
 * Standard node ID creation function
 * @param type Node type
 * @param name Main identifier (tool name, agent name, etc.)
 * @param ownerId Owner ID (optional)
 * @returns Standard formatted node ID
 */
export const createNodeId = (type: NodeType, name: string, ownerId?: string): string => {
  if (!ownerId || ownerId === name) {
    return `${type}_${name}`;
  }
  return `${type}_${name}_${ownerId}`;
};

/**
 * Function to extract node type from NodeID
 * @param nodeId Node ID
 * @returns NodeType or null (if type cannot be found)
 */
export const getNodeTypeFromNodeId = (nodeId: string): NodeType | null => {
  const parts = nodeId.split("_");
  if (parts.length >= 1) {
    const typePart = parts[0].toLowerCase();
    for (const type of Object.values(NodeType)) {
      if (typePart === type) {
        return type as NodeType;
      }
    }
  }
  return null;
};

/**
 * Workflow step types enum
 */
export type WorkflowStepType =
  | "agent"
  | "func"
  | "conditional-when"
  | "parallel-all"
  | "parallel-race";

/**
 * Create a workflow step node ID with consistent pattern
 * @param stepType Type of workflow step
 * @param stepIndex Index of step in workflow
 * @param workflowId Workflow identifier
 * @param options Additional options for node ID generation
 * @returns Consistent workflow step node ID
 */
export const createWorkflowStepNodeId = (
  stepType: WorkflowStepType,
  stepIndex: number,
  workflowId: string,
  options?: {
    agentId?: string;
    parallelIndex?: number;
    stepName?: string;
    stepId?: string;
  },
): string => {
  // Create base node type based on step type
  const nodeType = getWorkflowStepNodeType(stepType);

  // Create base identifier: stepType_stepIndex_workflowId
  const baseIdentifier = `${stepType}_${stepIndex}_${workflowId}`;

  // Add specific identifiers based on step type and options
  if (stepType === "agent" && options?.agentId) {
    return createNodeId(nodeType, baseIdentifier, options.agentId);
  }
  if (options?.parallelIndex !== undefined) {
    return createNodeId(nodeType, baseIdentifier, `parallel_${options.parallelIndex}`);
  }
  if (options?.stepName) {
    // ✅ FIXED: stepName can be used for ALL step types (func, conditional-when, etc.)
    return createNodeId(nodeType, baseIdentifier, options.stepName);
  }
  if (options?.stepId) {
    // ❌ stepId should be last fallback only
    return createNodeId(nodeType, baseIdentifier, options.stepId);
  }

  return createNodeId(nodeType, baseIdentifier);
};

/**
 * Get NodeType for workflow step type
 * @param stepType Workflow step type
 * @returns Corresponding NodeType
 */
export const getWorkflowStepNodeType = (stepType: WorkflowStepType): NodeType => {
  switch (stepType) {
    case "agent":
      return NodeType.WORKFLOW_AGENT_STEP;
    case "func":
      return NodeType.WORKFLOW_FUNC_STEP;
    case "conditional-when":
      return NodeType.WORKFLOW_CONDITIONAL_STEP;
    case "parallel-all":
      return NodeType.WORKFLOW_PARALLEL_ALL_STEP;
    case "parallel-race":
      return NodeType.WORKFLOW_PARALLEL_RACE_STEP;
    default:
      return NodeType.WORKFLOW_STEP;
  }
};

/**
 * Extract workflow step information from node ID
 * @param nodeId Workflow step node ID
 * @returns Extracted workflow step info or null
 */
export const extractWorkflowStepInfo = (
  nodeId: string,
): {
  stepType: WorkflowStepType;
  stepIndex: number;
  workflowId: string;
  agentId?: string;
  parallelIndex?: number;
  stepName?: string;
} | null => {
  const parts = nodeId.split("_");

  // Basic validation
  if (parts.length < 4) return null;

  const [nodeType, stepType, stepIndex, workflowId, ...rest] = parts;

  // Validate node type is workflow-related
  if (!nodeType.startsWith("workflow")) return null;

  const parsedStepIndex = Number.parseInt(stepIndex);
  if (Number.isNaN(parsedStepIndex)) return null;

  const result = {
    stepType: stepType as WorkflowStepType,
    stepIndex: parsedStepIndex,
    workflowId,
  };

  // Extract additional identifiers
  if (rest.length > 0) {
    const identifier = rest.join("_");

    if (stepType === "agent") {
      (result as any).agentId = identifier;
    } else if (stepType === "func") {
      (result as any).stepName = identifier;
    } else if (identifier.startsWith("parallel_")) {
      const parallelIndex = Number.parseInt(identifier.replace("parallel_", ""));
      if (!Number.isNaN(parallelIndex)) {
        (result as any).parallelIndex = parallelIndex;
      }
    }
  }

  return result;
};

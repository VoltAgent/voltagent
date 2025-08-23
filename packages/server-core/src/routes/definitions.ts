/**
 * Framework-agnostic route definitions
 * These can be used by any server implementation (Hono, Fastify, Express, etc.)
 */

/**
 * HTTP methods
 */
export type HttpMethod = "get" | "post" | "put" | "patch" | "delete" | "options" | "head";

/**
 * Response definition for a specific status code
 */
export interface ResponseDefinition {
  description: string;
  contentType?: string;
}

/**
 * Base route definition that can be used by any framework
 */
export interface RouteDefinition {
  method: HttpMethod;
  path: string;
  summary: string;
  description: string;
  tags: string[];
  operationId?: string;
  responses?: Record<number, ResponseDefinition>;
}

/**
 * Agent route definitions
 */
export const AGENT_ROUTES = {
  listAgents: {
    method: "get" as const,
    path: "/agents",
    summary: "List all registered agents",
    description:
      "Retrieve a comprehensive list of all agents registered in the system. Each agent includes its configuration, status, model information, tools, sub-agents, and memory settings. Use this endpoint to discover available agents and their capabilities.",
    tags: ["Agent Management"],
    operationId: "listAgents",
    responses: {
      200: {
        description: "Successfully retrieved list of all registered agents",
        contentType: "application/json",
      },
      500: {
        description: "Failed to retrieve agents due to server error",
        contentType: "application/json",
      },
    },
  },
  getAgent: {
    method: "get" as const,
    path: "/agents/:id",
    summary: "Get agent by ID",
    description: "Retrieve detailed information about a specific agent by its ID.",
    tags: ["Agent Management"],
    operationId: "getAgent",
    responses: {
      200: {
        description: "Successfully retrieved agent details",
        contentType: "application/json",
      },
      404: {
        description: "Agent not found",
        contentType: "application/json",
      },
      500: {
        description: "Failed to retrieve agent due to server error",
        contentType: "application/json",
      },
    },
  },
  generateText: {
    method: "post" as const,
    path: "/agents/:id/text",
    summary: "Generate text response",
    description:
      "Generate a text response from an agent using the provided conversation history. This endpoint processes messages synchronously and returns the complete response once generation is finished. Use this for traditional request-response interactions where you need the full response before proceeding.",
    tags: ["Agent Generation"],
    operationId: "generateText",
    responses: {
      200: {
        description: "Successfully generated text response from the agent",
        contentType: "application/json",
      },
      400: {
        description: "Invalid request parameters or message format",
        contentType: "application/json",
      },
      404: {
        description: "Agent not found",
        contentType: "application/json",
      },
      500: {
        description: "Failed to generate text due to server error",
        contentType: "application/json",
      },
    },
  },
  streamText: {
    method: "post" as const,
    path: "/agents/:id/stream",
    summary: "Stream text response",
    description:
      "Generate a text response from an agent and stream it in real-time via Server-Sent Events (SSE). This endpoint is ideal for interactive applications where you want to display partial responses as they're generated, providing a more responsive user experience. Each event contains incremental text updates, timestamps, and completion status.",
    tags: ["Agent Generation"],
    operationId: "streamText",
    responses: {
      200: {
        description: "Successfully established SSE stream for text generation",
        contentType: "text/event-stream",
      },
      400: {
        description: "Invalid request parameters or message format",
        contentType: "application/json",
      },
      404: {
        description: "Agent not found",
        contentType: "application/json",
      },
      500: {
        description: "Failed to stream text due to server error",
        contentType: "application/json",
      },
    },
  },
  generateObject: {
    method: "post" as const,
    path: "/agents/:id/object",
    summary: "Generate structured object",
    description:
      "Generate a structured object that conforms to a specified JSON schema. This endpoint is perfect for extracting structured data from unstructured input, generating form data, or creating API responses with guaranteed structure. The agent will ensure the output matches the provided schema exactly.",
    tags: ["Agent Generation"],
    operationId: "generateObject",
    responses: {
      200: {
        description: "Successfully generated structured object matching the provided schema",
        contentType: "application/json",
      },
      400: {
        description: "Invalid request parameters, message format, or schema",
        contentType: "application/json",
      },
      404: {
        description: "Agent not found",
        contentType: "application/json",
      },
      500: {
        description: "Failed to generate object due to server error",
        contentType: "application/json",
      },
    },
  },
  streamObject: {
    method: "post" as const,
    path: "/agents/:id/stream-object",
    summary: "Stream structured object generation",
    description:
      "Generate a structured object and stream partial updates via Server-Sent Events (SSE). This allows you to display incremental object construction in real-time, useful for complex object generation where you want to show progress. Events may contain partial object updates or the complete final object, depending on the agent's implementation.",
    tags: ["Agent Generation"],
    operationId: "streamObject",
    responses: {
      200: {
        description: "Successfully established SSE stream for object generation",
        contentType: "text/event-stream",
      },
      400: {
        description: "Invalid request parameters, message format, or schema",
        contentType: "application/json",
      },
      404: {
        description: "Agent not found",
        contentType: "application/json",
      },
      500: {
        description: "Failed to stream object due to server error",
        contentType: "application/json",
      },
    },
  },
  getAgentHistory: {
    method: "get" as const,
    path: "/agents/:id/history",
    summary: "Get agent history",
    description: "Retrieve the execution history for a specific agent with pagination support.",
    tags: ["Agent Management"],
    operationId: "getAgentHistory",
    responses: {
      200: {
        description: "Successfully retrieved agent execution history",
        contentType: "application/json",
      },
      404: {
        description: "Agent not found",
        contentType: "application/json",
      },
      500: {
        description: "Failed to retrieve agent history due to server error",
        contentType: "application/json",
      },
    },
  },
} as const;

/**
 * Workflow route definitions
 */
export const WORKFLOW_ROUTES = {
  listWorkflows: {
    method: "get" as const,
    path: "/workflows",
    summary: "List all registered workflows",
    description:
      "Retrieve a list of all workflows registered in the system. Each workflow includes its ID, name, purpose, step count, and current status. Use this endpoint to discover available workflows and understand their capabilities before execution.",
    tags: ["Workflow Management"],
    operationId: "listWorkflows",
    responses: {
      200: {
        description: "Successfully retrieved list of all registered workflows",
        contentType: "application/json",
      },
      500: {
        description: "Failed to retrieve workflows due to server error",
        contentType: "application/json",
      },
    },
  },
  getWorkflow: {
    method: "get" as const,
    path: "/workflows/:id",
    summary: "Get workflow by ID",
    description: "Retrieve detailed information about a specific workflow by its ID.",
    tags: ["Workflow Management"],
    operationId: "getWorkflow",
    responses: {
      200: {
        description: "Successfully retrieved workflow details",
        contentType: "application/json",
      },
      404: {
        description: "Workflow not found",
        contentType: "application/json",
      },
      500: {
        description: "Failed to retrieve workflow due to server error",
        contentType: "application/json",
      },
    },
  },
  executeWorkflow: {
    method: "post" as const,
    path: "/workflows/:id/execute",
    summary: "Execute workflow synchronously",
    description:
      "Execute a workflow and wait for it to complete. This endpoint runs the workflow to completion and returns the final result. Use this for workflows that complete quickly or when you need the complete result before proceeding. For long-running workflows, consider using the streaming endpoint instead.",
    tags: ["Workflow Management"],
    operationId: "executeWorkflow",
    responses: {
      200: {
        description: "Successfully executed workflow and returned final result",
        contentType: "application/json",
      },
      400: {
        description: "Invalid workflow input or parameters",
        contentType: "application/json",
      },
      404: {
        description: "Workflow not found",
        contentType: "application/json",
      },
      500: {
        description: "Failed to execute workflow due to server error",
        contentType: "application/json",
      },
    },
  },
  streamWorkflow: {
    method: "post" as const,
    path: "/workflows/:id/stream",
    summary: "Stream workflow execution events",
    description:
      "Execute a workflow and stream real-time events via Server-Sent Events (SSE). The stream remains open during suspension and continues after resume.",
    tags: ["Workflow Management"],
    operationId: "streamWorkflow",
    responses: {
      200: {
        description: "Successfully established SSE stream for workflow execution",
        contentType: "text/event-stream",
      },
      400: {
        description: "Invalid workflow input or parameters",
        contentType: "application/json",
      },
      404: {
        description: "Workflow not found",
        contentType: "application/json",
      },
      500: {
        description: "Failed to stream workflow due to server error",
        contentType: "application/json",
      },
    },
  },
  suspendWorkflow: {
    method: "post" as const,
    path: "/workflows/:id/executions/:executionId/suspend",
    summary: "Suspend workflow execution",
    description:
      "Suspend a running workflow execution at its current step. This allows you to pause long-running workflows, perform external validations, wait for human approval, or handle rate limits. The workflow state is preserved and can be resumed later with the resume endpoint. Only workflows in 'running' state can be suspended.",
    tags: ["Workflow Management"],
    operationId: "suspendWorkflow",
    responses: {
      200: {
        description: "Successfully suspended workflow execution",
        contentType: "application/json",
      },
      400: {
        description: "Workflow is not in a suspendable state",
        contentType: "application/json",
      },
      404: {
        description: "Workflow or execution not found",
        contentType: "application/json",
      },
      500: {
        description: "Failed to suspend workflow due to server error",
        contentType: "application/json",
      },
    },
  },
  resumeWorkflow: {
    method: "post" as const,
    path: "/workflows/:id/executions/:executionId/resume",
    summary: "Resume suspended workflow",
    description:
      "Resume a previously suspended workflow execution from where it left off. You can optionally provide resume data that will be passed to the suspended step for processing. This is commonly used after human approval, external system responses, or scheduled resumptions. The workflow continues execution and returns the final result.",
    tags: ["Workflow Management"],
    operationId: "resumeWorkflow",
    responses: {
      200: {
        description: "Successfully resumed workflow execution and returned final result",
        contentType: "application/json",
      },
      400: {
        description: "Workflow is not in a suspended state",
        contentType: "application/json",
      },
      404: {
        description: "Workflow or execution not found",
        contentType: "application/json",
      },
      500: {
        description: "Failed to resume workflow due to server error",
        contentType: "application/json",
      },
    },
  },
} as const;

/**
 * Log route definitions
 */
export const LOG_ROUTES = {
  getLogs: {
    method: "get" as const,
    path: "/api/logs",
    summary: "Get logs with filters",
    description:
      "Retrieve system logs with optional filtering by level, agent ID, workflow ID, conversation ID, execution ID, and time range.",
    tags: ["Logging"],
    operationId: "getLogs",
    responses: {
      200: {
        description: "Successfully retrieved filtered log entries",
        contentType: "application/json",
      },
      400: {
        description: "Invalid filter parameters",
        contentType: "application/json",
      },
      500: {
        description: "Failed to retrieve logs due to server error",
        contentType: "application/json",
      },
    },
  },
} as const;

/**
 * Update route definitions
 */
export const UPDATE_ROUTES = {
  checkUpdates: {
    method: "get" as const,
    path: "/updates",
    summary: "Check for updates",
    description: "Check for available package updates in the VoltAgent ecosystem.",
    tags: ["System"],
    operationId: "checkUpdates",
    responses: {
      200: {
        description: "Successfully checked for available updates",
        contentType: "application/json",
      },
      500: {
        description: "Failed to check updates due to server error",
        contentType: "application/json",
      },
    },
  },
  installUpdates: {
    method: "post" as const,
    path: "/updates/install",
    summary: "Install updates",
    description:
      "Install available updates for VoltAgent packages. Can install a single package or all packages.",
    tags: ["System"],
    operationId: "installUpdates",
    responses: {
      200: {
        description: "Successfully installed requested updates",
        contentType: "application/json",
      },
      400: {
        description: "Invalid update request or package not found",
        contentType: "application/json",
      },
      500: {
        description: "Failed to install updates due to server error",
        contentType: "application/json",
      },
    },
  },
} as const;

/**
 * All route definitions combined
 */
export const ALL_ROUTES = {
  ...AGENT_ROUTES,
  ...WORKFLOW_ROUTES,
  ...LOG_ROUTES,
  ...UPDATE_ROUTES,
} as const;

/**
 * Helper to get all routes as an array
 */
export function getAllRoutesArray(): RouteDefinition[] {
  return Object.values(ALL_ROUTES).map((route) => ({
    ...route,
    tags: [...route.tags], // Convert readonly array to mutable array
    responses: route.responses ? { ...route.responses } : undefined,
  }));
}

/**
 * Helper to get routes by tag
 */
export function getRoutesByTag(tag: string): RouteDefinition[] {
  return getAllRoutesArray().filter((route) => route.tags.includes(tag));
}

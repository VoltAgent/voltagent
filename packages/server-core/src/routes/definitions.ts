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
    summary: "Stream raw text response",
    description:
      "Generate a text response from an agent and stream the raw fullStream data via Server-Sent Events (SSE). This endpoint provides direct access to all stream events including text deltas, tool calls, and tool results. Use this for advanced applications that need full control over stream processing.",
    tags: ["Agent Generation"],
    operationId: "streamText",
    responses: {
      200: {
        description: "Successfully established SSE stream for raw text generation",
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
  chatStream: {
    method: "post" as const,
    path: "/agents/:id/chat",
    summary: "Stream chat messages",
    description:
      "Generate a text response from an agent and stream it as UI messages via Server-Sent Events (SSE). This endpoint is optimized for chat interfaces and works seamlessly with the AI SDK's useChat hook. It provides a high-level stream format with automatic handling of messages, tool calls, and metadata.",
    tags: ["Agent Generation"],
    operationId: "chatStream",
    responses: {
      200: {
        description: "Successfully established SSE stream for chat generation",
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
        description: "Failed to stream chat due to server error",
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
  cancelWorkflow: {
    method: "post" as const,
    path: "/workflows/:id/executions/:executionId/cancel",
    summary: "Cancel workflow execution",
    description:
      "Cancel a running workflow execution immediately. The workflow stops execution and the state is marked as cancelled. Cancelled workflows cannot be resumed.",
    tags: ["Workflow Management"],
    operationId: "cancelWorkflow",
    responses: {
      200: {
        description: "Successfully cancelled workflow execution",
        contentType: "application/json",
      },
      404: {
        description: "Workflow or execution not found",
        contentType: "application/json",
      },
      409: {
        description: "Workflow execution already completed or not cancellable",
        contentType: "application/json",
      },
      500: {
        description: "Failed to cancel workflow due to server error",
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
  getWorkflowState: {
    method: "get" as const,
    path: "/workflows/:id/executions/:executionId/state",
    summary: "Get workflow execution state",
    description:
      "Retrieve the workflow execution state including input data, suspension information, context, and current status. This is essential for understanding the current state of a workflow execution, especially for suspended workflows that need to be resumed with the correct context.",
    tags: ["Workflow Management"],
    operationId: "getWorkflowState",
    responses: {
      200: {
        description: "Successfully retrieved workflow execution state",
        contentType: "application/json",
      },
      404: {
        description: "Workflow or execution not found",
        contentType: "application/json",
      },
      500: {
        description: "Failed to retrieve workflow state due to server error",
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
    path: "/updates",
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
  installSingleUpdate: {
    method: "post" as const,
    path: "/updates/:packageName",
    summary: "Install single package update",
    description:
      "Install update for a specific VoltAgent package. The package manager is automatically detected based on lock files (pnpm-lock.yaml, yarn.lock, package-lock.json, or bun.lockb).",
    tags: ["System"],
    operationId: "installSingleUpdate",
    responses: {
      200: {
        description: "Successfully installed package update",
        contentType: "application/json",
      },
      400: {
        description: "Invalid package name or package not found",
        contentType: "application/json",
      },
      500: {
        description: "Failed to install update due to server error",
        contentType: "application/json",
      },
    },
  },
} as const;

/**
 * Observability route definitions
 */
export const OBSERVABILITY_ROUTES = {
  setupObservability: {
    method: "post" as const,
    path: "/setup-observability",
    summary: "Configure observability settings",
    description:
      "Updates the .env file with VoltAgent public and secret keys to enable observability features. This allows automatic tracing and monitoring of agent operations.",
    tags: ["Observability"],
    operationId: "setupObservability",
    responses: {
      200: {
        description: "Successfully configured observability settings",
        contentType: "application/json",
      },
      400: {
        description: "Invalid request - missing publicKey or secretKey",
        contentType: "application/json",
      },
      500: {
        description: "Failed to update .env file",
        contentType: "application/json",
      },
    },
  },
  getTraces: {
    method: "get" as const,
    path: "/observability/traces",
    summary: "List all traces",
    description:
      "Retrieve all OpenTelemetry traces from the observability store. Each trace represents a complete operation with its spans showing the execution flow.",
    tags: ["Observability"],
    operationId: "getTraces",
    responses: {
      200: {
        description: "Successfully retrieved traces",
        contentType: "application/json",
      },
      500: {
        description: "Failed to retrieve traces due to server error",
        contentType: "application/json",
      },
    },
  },
  getTraceById: {
    method: "get" as const,
    path: "/observability/traces/:traceId",
    summary: "Get trace by ID",
    description: "Retrieve a specific trace and all its spans by trace ID.",
    tags: ["Observability"],
    operationId: "getTraceById",
    responses: {
      200: {
        description: "Successfully retrieved trace",
        contentType: "application/json",
      },
      404: {
        description: "Trace not found",
        contentType: "application/json",
      },
      500: {
        description: "Failed to retrieve trace due to server error",
        contentType: "application/json",
      },
    },
  },
  getSpanById: {
    method: "get" as const,
    path: "/observability/spans/:spanId",
    summary: "Get span by ID",
    description: "Retrieve a specific span by its ID.",
    tags: ["Observability"],
    operationId: "getSpanById",
    responses: {
      200: {
        description: "Successfully retrieved span",
        contentType: "application/json",
      },
      404: {
        description: "Span not found",
        contentType: "application/json",
      },
      500: {
        description: "Failed to retrieve span due to server error",
        contentType: "application/json",
      },
    },
  },
  getObservabilityStatus: {
    method: "get" as const,
    path: "/observability/status",
    summary: "Get observability status",
    description: "Check the status and configuration of the observability system.",
    tags: ["Observability"],
    operationId: "getObservabilityStatus",
    responses: {
      200: {
        description: "Successfully retrieved observability status",
        contentType: "application/json",
      },
      500: {
        description: "Failed to retrieve status due to server error",
        contentType: "application/json",
      },
    },
  },
  getLogsByTraceId: {
    method: "get" as const,
    path: "/observability/traces/:traceId/logs",
    summary: "Get logs by trace ID",
    description: "Retrieve all logs associated with a specific trace ID.",
    tags: ["Observability"],
    operationId: "getLogsByTraceId",
    responses: {
      200: {
        description: "Successfully retrieved logs",
        contentType: "application/json",
      },
      404: {
        description: "No logs found for the trace",
        contentType: "application/json",
      },
      500: {
        description: "Failed to retrieve logs due to server error",
        contentType: "application/json",
      },
    },
  },
  getLogsBySpanId: {
    method: "get" as const,
    path: "/observability/spans/:spanId/logs",
    summary: "Get logs by span ID",
    description: "Retrieve all logs associated with a specific span ID.",
    tags: ["Observability"],
    operationId: "getLogsBySpanId",
    responses: {
      200: {
        description: "Successfully retrieved logs",
        contentType: "application/json",
      },
      404: {
        description: "No logs found for the span",
        contentType: "application/json",
      },
      500: {
        description: "Failed to retrieve logs due to server error",
        contentType: "application/json",
      },
    },
  },
  queryLogs: {
    method: "get" as const,
    path: "/observability/logs",
    summary: "Query logs",
    description: "Query logs with filters such as severity, time range, trace ID, etc.",
    tags: ["Observability"],
    operationId: "queryLogs",
    responses: {
      200: {
        description: "Successfully retrieved logs",
        contentType: "application/json",
      },
      400: {
        description: "Invalid query parameters",
        contentType: "application/json",
      },
      500: {
        description: "Failed to query logs due to server error",
        contentType: "application/json",
      },
    },
  },
} as const;

export const OBSERVABILITY_MEMORY_ROUTES = {
  listMemoryUsers: {
    method: "get" as const,
    path: "/observability/memory/users",
    summary: "List memory users",
    description:
      "Retrieve all users who have associated memory records. Supports optional filtering by agent and pagination controls.",
    tags: ["Observability", "Memory"],
    operationId: "listMemoryUsers",
    responses: {
      200: {
        description: "Successfully retrieved users",
        contentType: "application/json",
      },
      500: {
        description: "Failed to retrieve memory users due to server error",
        contentType: "application/json",
      },
    },
  },
  listMemoryConversations: {
    method: "get" as const,
    path: "/observability/memory/conversations",
    summary: "List memory conversations",
    description:
      "Retrieve conversations stored in memory with optional filtering by agent or user. Results are paginated and sorted by last update by default.",
    tags: ["Observability", "Memory"],
    operationId: "listMemoryConversations",
    responses: {
      200: {
        description: "Successfully retrieved conversations",
        contentType: "application/json",
      },
      500: {
        description: "Failed to retrieve conversations due to server error",
        contentType: "application/json",
      },
    },
  },
  getMemoryConversationMessages: {
    method: "get" as const,
    path: "/observability/memory/conversations/:conversationId/messages",
    summary: "Get conversation messages",
    description:
      "Fetch the messages for a specific conversation stored in memory. Supports optional role filtering and windowing via before/after parameters.",
    tags: ["Observability", "Memory"],
    operationId: "getMemoryConversationMessages",
    responses: {
      200: {
        description: "Successfully retrieved messages",
        contentType: "application/json",
      },
      404: {
        description: "Conversation not found",
        contentType: "application/json",
      },
      500: {
        description: "Failed to retrieve messages due to server error",
        contentType: "application/json",
      },
    },
  },
  getWorkingMemory: {
    method: "get" as const,
    path: "/observability/memory/working-memory",
    summary: "Get working memory",
    description:
      "Retrieve working memory content for a conversation or user. Specify the scope and relevant identifiers in query parameters.",
    tags: ["Observability", "Memory"],
    operationId: "getWorkingMemory",
    responses: {
      200: {
        description: "Successfully retrieved working memory",
        contentType: "application/json",
      },
      404: {
        description: "Working memory not found",
        contentType: "application/json",
      },
      500: {
        description: "Failed to retrieve working memory due to server error",
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
  ...OBSERVABILITY_ROUTES,
  ...OBSERVABILITY_MEMORY_ROUTES,
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
 * MCP route definitions
 */
export const MCP_ROUTES = {
  listServers: {
    method: "get" as const,
    path: "/mcp/servers",
    summary: "List MCP servers",
    description:
      "Return metadata for all MCP servers currently registered with the running VoltAgent instance.",
    tags: ["MCP"],
    operationId: "listMcpServers",
    responses: {
      200: {
        description: "Successfully retrieved the list of MCP servers",
        contentType: "application/json",
      },
      500: {
        description: "Failed to retrieve MCP servers",
        contentType: "application/json",
      },
    },
  },
  getServer: {
    method: "get" as const,
    path: "/mcp/servers/:serverId",
    summary: "Get MCP server metadata",
    description: "Return metadata for a specific MCP server by ID.",
    tags: ["MCP"],
    operationId: "getMcpServer",
    responses: {
      200: {
        description: "Successfully retrieved MCP server metadata",
        contentType: "application/json",
      },
      404: {
        description: "Requested MCP server does not exist",
        contentType: "application/json",
      },
    },
  },
  listTools: {
    method: "get" as const,
    path: "/mcp/servers/:serverId/tools",
    summary: "List MCP server tools",
    description:
      "Return the tools exposed by a specific MCP server, including metadata for UI rendering.",
    tags: ["MCP"],
    operationId: "listMcpServerTools",
    responses: {
      200: {
        description: "Successfully retrieved tool metadata",
        contentType: "application/json",
      },
      404: {
        description: "Requested MCP server does not exist or has no tools",
        contentType: "application/json",
      },
      500: {
        description: "Failed to retrieve MCP tools",
        contentType: "application/json",
      },
    },
  },
  invokeTool: {
    method: "post" as const,
    path: "/mcp/servers/:serverId/tools/:toolName",
    summary: "Invoke MCP tool",
    description: "Execute a single MCP tool exposed by the given server with provided arguments.",
    tags: ["MCP"],
    operationId: "invokeMcpTool",
    responses: {
      200: {
        description: "Tool executed successfully",
        contentType: "application/json",
      },
      404: {
        description: "Requested MCP server or tool does not exist",
        contentType: "application/json",
      },
      500: {
        description: "Tool execution failed",
        contentType: "application/json",
      },
    },
  },
  setLogLevel: {
    method: "post" as const,
    path: "/mcp/servers/:serverId/logging/level",
    summary: "Update MCP logging level",
    description:
      "Update the logging level of an MCP server when the logging capability is enabled.",
    tags: ["MCP"],
    operationId: "setMcpLogLevel",
    responses: {
      200: {
        description: "Logging level updated",
        contentType: "application/json",
      },
      404: {
        description: "Requested MCP server does not support logging capability",
        contentType: "application/json",
      },
      500: {
        description: "Failed to update logging level",
        contentType: "application/json",
      },
    },
  },
  listPrompts: {
    method: "get" as const,
    path: "/mcp/servers/:serverId/prompts",
    summary: "List MCP prompts",
    description:
      "Return all prompts exposed by an MCP server when the prompts capability is enabled.",
    tags: ["MCP"],
    operationId: "listMcpPrompts",
    responses: {
      200: {
        description: "Successfully retrieved MCP prompts",
        contentType: "application/json",
      },
      404: {
        description: "Requested MCP server does not expose prompts",
        contentType: "application/json",
      },
      500: {
        description: "Failed to retrieve MCP prompts",
        contentType: "application/json",
      },
    },
  },
  getPrompt: {
    method: "get" as const,
    path: "/mcp/servers/:serverId/prompts/:promptName",
    summary: "Get MCP prompt",
    description:
      "Retrieve a fully resolved prompt by name from an MCP server, optionally templated with arguments.",
    tags: ["MCP"],
    operationId: "getMcpPrompt",
    responses: {
      200: {
        description: "Successfully retrieved MCP prompt",
        contentType: "application/json",
      },
      400: {
        description: "Invalid prompt arguments",
        contentType: "application/json",
      },
      404: {
        description: "Requested MCP server does not expose prompts",
        contentType: "application/json",
      },
      500: {
        description: "Failed to retrieve MCP prompt",
        contentType: "application/json",
      },
    },
  },
  listResources: {
    method: "get" as const,
    path: "/mcp/servers/:serverId/resources",
    summary: "List MCP resources",
    description:
      "Return all static or dynamic resources available from an MCP server when the resources capability is enabled.",
    tags: ["MCP"],
    operationId: "listMcpResources",
    responses: {
      200: {
        description: "Successfully retrieved MCP resources",
        contentType: "application/json",
      },
      404: {
        description: "Requested MCP server does not expose resources",
        contentType: "application/json",
      },
      500: {
        description: "Failed to retrieve MCP resources",
        contentType: "application/json",
      },
    },
  },
  readResource: {
    method: "get" as const,
    path: "/mcp/servers/:serverId/resources/contents",
    summary: "Read MCP resource",
    description: "Fetch the contents of a resource by URI from an MCP server.",
    tags: ["MCP"],
    operationId: "readMcpResource",
    responses: {
      200: {
        description: "Successfully retrieved MCP resource contents",
        contentType: "application/json",
      },
      400: {
        description: "Missing or invalid resource URI",
        contentType: "application/json",
      },
      404: {
        description: "Requested MCP server does not expose resources",
        contentType: "application/json",
      },
      500: {
        description: "Failed to retrieve MCP resource contents",
        contentType: "application/json",
      },
    },
  },
  listResourceTemplates: {
    method: "get" as const,
    path: "/mcp/servers/:serverId/resource-templates",
    summary: "List MCP resource templates",
    description: "Return resource templates exposed by an MCP server when supported.",
    tags: ["MCP"],
    operationId: "listMcpResourceTemplates",
    responses: {
      200: {
        description: "Successfully retrieved MCP resource templates",
        contentType: "application/json",
      },
      404: {
        description: "Requested MCP server does not expose resource templates",
        contentType: "application/json",
      },
      500: {
        description: "Failed to retrieve MCP resource templates",
        contentType: "application/json",
      },
    },
  },
} satisfies Record<string, RouteDefinition>;

export const A2A_ROUTES = {
  agentCard: {
    method: "get" as const,
    path: "/.well-known/:serverId/agent-card.json",
    summary: "Get A2A agent card",
    description: "Return the agent card JSON document for the specified A2A server.",
    tags: ["A2A"],
    operationId: "getA2AAgentCard",
    responses: {
      200: {
        description: "Agent card retrieved successfully",
        contentType: "application/json",
      },
      404: {
        description: "Requested A2A server not found",
        contentType: "application/json",
      },
      400: {
        description: "Invalid request parameters",
        contentType: "application/json",
      },
    },
  },
  jsonRpc: {
    method: "post" as const,
    path: "/a2a/:serverId",
    summary: "Dispatch A2A JSON-RPC request",
    description:
      "Forward a JSON-RPC message (message/send, message/stream, tasks/get, tasks/cancel) to the specified A2A server.",
    tags: ["A2A"],
    operationId: "executeA2ARequest",
    responses: {
      200: {
        description: "Request accepted or completed",
        contentType: "application/json",
      },
      400: {
        description: "Invalid JSON-RPC payload",
        contentType: "application/json",
      },
      404: {
        description: "Requested A2A server not found",
        contentType: "application/json",
      },
    },
  },
} satisfies Record<string, RouteDefinition>;

/**
 * Helper to get routes by tag
 */
export function getRoutesByTag(tag: string): RouteDefinition[] {
  return getAllRoutesArray().filter((route) => route.tags.includes(tag));
}

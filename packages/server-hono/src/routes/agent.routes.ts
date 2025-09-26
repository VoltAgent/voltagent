import {
  AGENT_ROUTES,
  AgentListSchema,
  ErrorSchema,
  ObjectRequestSchema,
  ObjectResponseSchema,
  StreamObjectEventSchema,
  StreamTextEventSchema,
  TextRequestSchema,
  TextResponseSchema,
  WORKFLOW_ROUTES,
  WorkflowCancelRequestSchema,
  WorkflowCancelResponseSchema,
  WorkflowExecutionRequestSchema,
  WorkflowExecutionResponseSchema,
  WorkflowListSchema,
  WorkflowResumeRequestSchema,
  WorkflowResumeResponseSchema,
  WorkflowStreamEventSchema,
  WorkflowSuspendRequestSchema,
  WorkflowSuspendResponseSchema,
} from "@voltagent/server-core";
import { createRoute, z } from "../zod-openapi-compat";
import { createPathParam } from "./path-params";

const agentIdParam = () => createPathParam("id", "The ID of the agent", "my-agent-123");
const workflowIdParam = () => createPathParam("id", "The ID of the workflow", "my-workflow-123");
const executionIdParam = () =>
  createPathParam("executionId", "The ID of the execution to operate on", "exec_1234567890_abc123");

// Re-export schemas from server-core for backward compatibility
export {
  ParamsSchema,
  AgentParamsSchema,
  WorkflowParamsSchema,
  WorkflowExecutionParamsSchema,
  ErrorSchema,
  AgentResponseSchema,
  AgentListSchema,
  TextRequestSchema,
  TextResponseSchema,
  StreamTextEventSchema,
  ObjectRequestSchema,
  ObjectResponseSchema,
  StreamObjectEventSchema,
  WorkflowResponseSchema,
  WorkflowListSchema,
  WorkflowExecutionRequestSchema,
  WorkflowExecutionResponseSchema,
  WorkflowStreamEventSchema,
  WorkflowSuspendRequestSchema,
  WorkflowSuspendResponseSchema,
  WorkflowCancelRequestSchema,
  WorkflowCancelResponseSchema,
  WorkflowResumeRequestSchema,
  WorkflowResumeResponseSchema,
} from "@voltagent/server-core";

// --- Route Definitions ---

// Get all agents route
export const getAgentsRoute = createRoute({
  method: AGENT_ROUTES.listAgents.method,
  path: AGENT_ROUTES.listAgents.path,
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: AgentListSchema,
          }),
        },
      },
      description:
        AGENT_ROUTES.listAgents.responses?.[200]?.description || "List of all registered agents",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description:
        AGENT_ROUTES.listAgents.responses?.[500]?.description || "Failed to retrieve agents",
    },
  },
  tags: [...AGENT_ROUTES.listAgents.tags],
  summary: AGENT_ROUTES.listAgents.summary,
  description: AGENT_ROUTES.listAgents.description,
});

// Generate text response
export const textRoute = createRoute({
  method: AGENT_ROUTES.generateText.method,
  path: AGENT_ROUTES.generateText.path.replace(":id", "{id}"), // Convert path format
  request: {
    params: z.object({
      id: agentIdParam(),
    }),
    body: {
      content: {
        "application/json": {
          schema: TextRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: TextResponseSchema,
        },
      },
      description:
        AGENT_ROUTES.generateText.responses?.[200]?.description || "Successful text generation",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: AGENT_ROUTES.generateText.responses?.[404]?.description || "Agent not found",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description:
        AGENT_ROUTES.generateText.responses?.[500]?.description || "Failed to generate text",
    },
  },
  tags: [...AGENT_ROUTES.generateText.tags],
  summary: AGENT_ROUTES.generateText.summary,
  description: AGENT_ROUTES.generateText.description,
});

// Stream text response (raw fullStream)
export const streamRoute = createRoute({
  method: AGENT_ROUTES.streamText.method,
  path: AGENT_ROUTES.streamText.path.replace(":id", "{id}"), // Convert path format
  request: {
    params: z.object({
      id: agentIdParam(),
    }),
    body: {
      content: {
        "application/json": {
          schema: TextRequestSchema, // Reusing TextRequestSchema
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        // SSE streams are tricky in OpenAPI. Describe the format.
        "text/event-stream": {
          schema: StreamTextEventSchema, // Schema for the *content* of an event
        },
      },
      description: `Server-Sent Events stream with raw fullStream data. Each event is formatted as:\n\
'data: {"type":"text-delta","delta":"...","id":"..."}\n\n'\n
or\n\
'data: {"type":"tool-call","toolName":"...","args":{...}}\n\n'\n
or\n\
'data: {"type":"tool-result","toolName":"...","result":{...}}\n\n'\n
or\n\
'data: {"type":"finish","finishReason":"...","usage":{...}}\n\n'`,
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: AGENT_ROUTES.streamText.responses?.[404]?.description || "Agent not found",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: AGENT_ROUTES.streamText.responses?.[500]?.description || "Failed to stream text",
    },
  },
  tags: [...AGENT_ROUTES.streamText.tags],
  summary: AGENT_ROUTES.streamText.summary,
  description: AGENT_ROUTES.streamText.description,
});

// Chat stream response (UI message stream)
export const chatRoute = createRoute({
  method: AGENT_ROUTES.chatStream.method,
  path: AGENT_ROUTES.chatStream.path.replace(":id", "{id}"), // Convert path format
  request: {
    params: z.object({
      id: agentIdParam(),
    }),
    body: {
      content: {
        "application/json": {
          schema: TextRequestSchema, // Reusing TextRequestSchema
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "text/event-stream": {
          schema: StreamTextEventSchema,
        },
      },
      description:
        "Server-Sent Events stream formatted for useChat hook. UI message stream with automatic handling of messages, tool calls, and metadata.",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: AGENT_ROUTES.chatStream.responses?.[404]?.description || "Agent not found",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: AGENT_ROUTES.chatStream.responses?.[500]?.description || "Failed to stream chat",
    },
  },
  tags: [...AGENT_ROUTES.chatStream.tags],
  summary: AGENT_ROUTES.chatStream.summary,
  description: AGENT_ROUTES.chatStream.description,
});

// Generate object response
export const objectRoute = createRoute({
  method: AGENT_ROUTES.generateObject.method,
  path: AGENT_ROUTES.generateObject.path.replace(":id", "{id}"), // Convert path format
  request: {
    params: z.object({
      id: agentIdParam(),
    }),
    body: {
      content: {
        "application/json": {
          schema: ObjectRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ObjectResponseSchema,
        },
      },
      description:
        AGENT_ROUTES.generateObject.responses?.[200]?.description || "Successful object generation",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: AGENT_ROUTES.generateObject.responses?.[404]?.description || "Agent not found",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description:
        AGENT_ROUTES.generateObject.responses?.[500]?.description || "Failed to generate object",
    },
  },
  tags: [...AGENT_ROUTES.generateObject.tags],
  summary: AGENT_ROUTES.generateObject.summary,
  description: AGENT_ROUTES.generateObject.description,
});

// Stream object response
export const streamObjectRoute = createRoute({
  method: AGENT_ROUTES.streamObject.method,
  path: AGENT_ROUTES.streamObject.path.replace(":id", "{id}"), // Convert path format
  request: {
    params: z.object({
      id: agentIdParam(),
    }),
    body: {
      content: {
        "application/json": {
          schema: ObjectRequestSchema, // Reuse ObjectRequestSchema
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        // Describe SSE format for object streaming
        "text/event-stream": {
          schema: StreamObjectEventSchema, // Schema for the *content* of an event
        },
      },
      description: `Server-Sent Events stream for object generation.\n\
Events might contain partial object updates or the final object.\n\
The exact format (e.g., JSON patches, partial objects) depends on the agent's implementation.\n\
Example event: 'data: {"partialUpdate": {...}}\n\n' or 'data: {"finalObject": {...}}\n\n'`,
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: AGENT_ROUTES.streamObject.responses?.[404]?.description || "Agent not found",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description:
        AGENT_ROUTES.streamObject.responses?.[500]?.description || "Failed to stream object",
    },
  },
  tags: [...AGENT_ROUTES.streamObject.tags],
  summary: AGENT_ROUTES.streamObject.summary,
  description: AGENT_ROUTES.streamObject.description,
});

export const getWorkflowsRoute = createRoute({
  method: WORKFLOW_ROUTES.listWorkflows.method,
  path: WORKFLOW_ROUTES.listWorkflows.path,
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: WorkflowListSchema,
          }),
        },
      },
      description:
        WORKFLOW_ROUTES.listWorkflows.responses?.[200]?.description ||
        "List of all registered workflows",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description:
        WORKFLOW_ROUTES.listWorkflows.responses?.[500]?.description ||
        "Failed to retrieve workflows",
    },
  },
  tags: [...WORKFLOW_ROUTES.listWorkflows.tags],
  summary: WORKFLOW_ROUTES.listWorkflows.summary,
  description: WORKFLOW_ROUTES.listWorkflows.description,
});

// Stream workflow route
export const streamWorkflowRoute = createRoute({
  method: WORKFLOW_ROUTES.streamWorkflow.method,
  path: WORKFLOW_ROUTES.streamWorkflow.path.replace(":id", "{id}"), // Convert path format
  request: {
    params: z.object({
      id: workflowIdParam(),
    }),
    body: {
      content: {
        "application/json": {
          schema: WorkflowExecutionRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "text/event-stream": {
          schema: WorkflowStreamEventSchema,
        },
      },
      description: `Server-Sent Events stream for workflow execution.
Each event is formatted as:
'data: {"type":"step-start", "executionId":"...", "from":"...", ...}\\n\\n'

Event types include:
- workflow-start: Workflow execution started
- step-start: Step execution started
- step-complete: Step completed successfully
- workflow-suspended: Workflow suspended, awaiting resume
- workflow-cancelled: Workflow cancelled by client request
- workflow-complete: Workflow completed successfully
- workflow-error: Workflow encountered an error
- Custom events from step writers`,
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description:
        WORKFLOW_ROUTES.streamWorkflow.responses?.[404]?.description || "Workflow not found",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description:
        WORKFLOW_ROUTES.streamWorkflow.responses?.[500]?.description || "Internal server error",
    },
  },
  tags: [...WORKFLOW_ROUTES.streamWorkflow.tags],
  summary: WORKFLOW_ROUTES.streamWorkflow.summary,
  description: WORKFLOW_ROUTES.streamWorkflow.description,
});

// Execute workflow route
export const executeWorkflowRoute = createRoute({
  method: WORKFLOW_ROUTES.executeWorkflow.method,
  path: WORKFLOW_ROUTES.executeWorkflow.path.replace(":id", "{id}"), // Convert path format
  request: {
    params: z.object({
      id: workflowIdParam(),
    }),
    body: {
      content: {
        "application/json": {
          schema: WorkflowExecutionRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: WorkflowExecutionResponseSchema,
        },
      },
      description:
        WORKFLOW_ROUTES.executeWorkflow.responses?.[200]?.description ||
        "Successful workflow execution",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description:
        WORKFLOW_ROUTES.executeWorkflow.responses?.[404]?.description || "Workflow not found",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description:
        WORKFLOW_ROUTES.executeWorkflow.responses?.[500]?.description ||
        "Failed to execute workflow",
    },
  },
  tags: [...WORKFLOW_ROUTES.executeWorkflow.tags],
  summary: WORKFLOW_ROUTES.executeWorkflow.summary,
  description: WORKFLOW_ROUTES.executeWorkflow.description,
});

// Suspend workflow route
export const suspendWorkflowRoute = createRoute({
  method: WORKFLOW_ROUTES.suspendWorkflow.method,
  path: WORKFLOW_ROUTES.suspendWorkflow.path
    .replace(":id", "{id}")
    .replace(":executionId", "{executionId}"), // Convert path format
  request: {
    params: z.object({
      id: workflowIdParam(),
      executionId: executionIdParam(),
    }),
    body: {
      content: {
        "application/json": {
          schema: WorkflowSuspendRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: WorkflowSuspendResponseSchema,
        },
      },
      description:
        WORKFLOW_ROUTES.suspendWorkflow.responses?.[200]?.description ||
        "Successful workflow suspension",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description:
        WORKFLOW_ROUTES.suspendWorkflow.responses?.[400]?.description ||
        "Cannot suspend workflow in current state",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description:
        WORKFLOW_ROUTES.suspendWorkflow.responses?.[404]?.description ||
        "Workflow execution not found",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: WORKFLOW_ROUTES.suspendWorkflow.responses?.[500]?.description || "Server error",
    },
  },
  tags: [...WORKFLOW_ROUTES.suspendWorkflow.tags],
  summary: WORKFLOW_ROUTES.suspendWorkflow.summary,
  description: WORKFLOW_ROUTES.suspendWorkflow.description,
});

// Cancel workflow route
export const cancelWorkflowRoute = createRoute({
  method: WORKFLOW_ROUTES.cancelWorkflow.method,
  path: WORKFLOW_ROUTES.cancelWorkflow.path
    .replace(":id", "{id}")
    .replace(":executionId", "{executionId}"),
  request: {
    params: z.object({
      id: workflowIdParam(),
      executionId: executionIdParam(),
    }),
    body: {
      content: {
        "application/json": {
          schema: WorkflowCancelRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: WorkflowCancelResponseSchema,
        },
      },
      description:
        WORKFLOW_ROUTES.cancelWorkflow.responses?.[200]?.description ||
        "Successful workflow cancellation",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description:
        WORKFLOW_ROUTES.cancelWorkflow.responses?.[404]?.description ||
        "Workflow execution not found",
    },
    409: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description:
        WORKFLOW_ROUTES.cancelWorkflow.responses?.[409]?.description ||
        "Workflow execution not cancellable",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: WORKFLOW_ROUTES.cancelWorkflow.responses?.[500]?.description || "Server error",
    },
  },
  tags: [...WORKFLOW_ROUTES.cancelWorkflow.tags],
  summary: WORKFLOW_ROUTES.cancelWorkflow.summary,
  description: WORKFLOW_ROUTES.cancelWorkflow.description,
});

// Resume workflow route
export const resumeWorkflowRoute = createRoute({
  method: WORKFLOW_ROUTES.resumeWorkflow.method,
  path: WORKFLOW_ROUTES.resumeWorkflow.path
    .replace(":id", "{id}")
    .replace(":executionId", "{executionId}"), // Convert path format
  request: {
    params: z.object({
      id: workflowIdParam(),
      executionId: executionIdParam(),
    }),
    body: {
      content: {
        "application/json": {
          schema: WorkflowResumeRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: WorkflowResumeResponseSchema,
        },
      },
      description:
        WORKFLOW_ROUTES.resumeWorkflow.responses?.[200]?.description ||
        "Successful workflow resume",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description:
        WORKFLOW_ROUTES.resumeWorkflow.responses?.[404]?.description ||
        "Workflow execution not found or not suspended",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: WORKFLOW_ROUTES.resumeWorkflow.responses?.[500]?.description || "Server error",
    },
  },
  tags: [...WORKFLOW_ROUTES.resumeWorkflow.tags],
  summary: WORKFLOW_ROUTES.resumeWorkflow.summary,
  description: WORKFLOW_ROUTES.resumeWorkflow.description,
});

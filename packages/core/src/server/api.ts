import fs from "node:fs/promises";
import path from "node:path";
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { LogFilter } from "@voltagent/internal";
import { cors } from "hono/cors";
import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import type { z } from "zod";
import { convertJsonSchemaToZod } from "zod-from-json-schema";
import type { AgentHistoryEntry } from "../agent/history";
import type { AgentStatus } from "../agent/types";
import { AgentEventEmitter } from "../events";
import { LoggerProxy, getGlobalLogBuffer } from "../logger";
import { zodSchemaToJsonUI } from "../utils/toolParser";
import {
  type PackageUpdateInfo,
  checkForUpdates,
  updateAllPackages,
  updateSinglePackage,
} from "../utils/update";
import { WorkflowRegistry } from "../workflow/registry";
import {
  type ErrorSchema,
  type ObjectRequestSchema,
  type ObjectResponseSchema,
  type TextRequestSchema,
  type TextResponseSchema,
  executeWorkflowRoute,
  getAgentsRoute,
  getWorkflowsRoute,
  objectRoute,
  resumeWorkflowRoute,
  streamObjectRoute,
  streamRoute,
  suspendWorkflowRoute,
  textRoute,
} from "./api.routes";
import { getLogsRoute } from "./api.routes.logs";
import type { CustomEndpointDefinition } from "./custom-endpoints";
import {
  CustomEndpointError,
  validateCustomEndpoint,
  validateCustomEndpoints,
} from "./custom-endpoints";
import { LogStreamManager } from "./log-stream";
import { AgentRegistry } from "./registry";
import type { AgentResponse, ApiContext, ApiResponse } from "./types";

// Configuration interface
export interface ServerConfig {
  enableSwaggerUI?: boolean;
  port?: number;
}

const app = new OpenAPIHono();
const logger = new LoggerProxy({ component: "api-server" });

// Function to setup Swagger UI based on config
export const setupSwaggerUI = (config?: ServerConfig) => {
  const isProduction = process.env.NODE_ENV === "production";
  const shouldEnableSwaggerUI = config?.enableSwaggerUI ?? !isProduction;

  if (shouldEnableSwaggerUI) {
    app.get("/ui", swaggerUI({ url: "/doc" }));
  }
};

// Nerdy landing page
app.get("/", (c) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Voltagent Core API</title>
        <style>
            body {
                background-color: #2a2a2a; /* Slightly lighter dark */
                color: #cccccc; /* Light gray text */
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                text-align: center;
            }
            .container {
                padding: 40px;
            }
            h1 {
                color: #eeeeee; /* Brighter heading */
                border-bottom: 1px solid #555555; /* Subtler border */
                padding-bottom: 10px;
                margin-bottom: 20px;
                font-weight: 500; /* Slightly lighter font weight */
            }
            p {
                font-size: 1.1em;
                margin-bottom: 30px;
                line-height: 1.6;
            }
            a {
                color: #64b5f6; /* Light blue link */
                text-decoration: none;
                font-weight: bold;
                border: 1px solid #64b5f6;
                padding: 10px 15px;
                border-radius: 4px;
                transition: background-color 0.2s, color 0.2s;
             }
            a:hover {
                text-decoration: underline; /* Add underline on hover */
            }
            .logo {
              font-size: 1.8em; /* Slightly smaller logo */
              font-weight: bold;
              margin-bottom: 30px;
              color: #eeeeee;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">VoltAgent</div>
            <h1>API Running ⚡</h1>
            <p>Manage and monitor your agents via the VoltOps Platform.</p>
            <a href="https://console.voltagent.dev" target="_blank" style="margin-bottom: 30px; display: inline-block;">Go to VoltOps Platform</a>
            <div class="support-links" style="margin-top: 15px;">
              <p style="margin-bottom: 15px;">If you find VoltAgent useful, please consider giving us a <a href="http://github.com/voltAgent/voltagent" target="_blank" style="border: none; padding: 0; font-weight: bold; color: #64b5f6;"> star on GitHub ⭐</a>!</p>
              <p>Need support or want to connect with the community? Join our <a href="https://s.voltagent.dev/discord" target="_blank" style="border: none; padding: 0; font-weight: bold; color: #64b5f6;">Discord server</a>.</p>
            </div>
            <div style="margin-top: 30px; display: flex; flex-direction: row; justify-content: center; align-items: center; gap: 25px;">
              <a href="/ui" target="_blank" style="border: none; padding: 0; font-weight: bold; color: #64b5f6;">Swagger UI</a>
              <span style="color: #555555;">|</span> <!-- Optional separator -->
              <a href="/doc" target="_blank" style="border: none; padding: 0; font-weight: bold; color: #64b5f6;">OpenAPI Spec</a>
            </div>
        </div>
        <script>
            console.log("%c⚡ VoltAgent Activated ⚡ %c", "color: #64b5f6; font-size: 1.5em; font-weight: bold;", "color: #cccccc; font-size: 1em;");
        </script>
    </body>
    </html>
  `;
  return c.html(html);
});

app.use("/*", cors());
// Store WebSocket connections for each agent
const agentConnections = new Map<string, Set<WebSocket>>();
// Store WebSocket connections for each workflow
const workflowConnections = new Map<string, Set<WebSocket>>();
// Log stream manager for real-time log streaming
const logStreamManager = new LogStreamManager();

// Enable CORS for all routes
app.use(
  "/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
    maxAge: 600,
    credentials: true,
  }),
);

// Get all agents
app.openapi(getAgentsRoute, (c) => {
  const registry = AgentRegistry.getInstance();
  try {
    const agents = registry.getAllAgents();
    const agentDataArray = agents.map((agent) => {
      const fullState = agent.getFullState();
      const isTelemetryEnabled = agent.isTelemetryConfigured();
      return {
        // Explicitly list all properties expected by AgentResponseSchema
        id: fullState.id,
        name: fullState.name,
        description: fullState.instructions || fullState.description,
        status: fullState.status as AgentStatus,
        model: fullState.model,
        tools: agent.getToolsForApi() as any, // Cast to any as per schema
        subAgents:
          fullState.subAgents?.map((subAgent: any) => ({
            id: subAgent.id || "",
            name: subAgent.name || "",
            description: subAgent.instructions || subAgent.description || "",
            status: (subAgent.status as AgentStatus) || "idle",
            model: subAgent.model || "",
            tools: subAgent.tools || [],
            memory: subAgent.memory,
          })) || [],
        memory: fullState.memory as any, // Cast to any as per schema
        isTelemetryEnabled,
        // Include other passthrough properties from fullState if necessary
        // For now, focusing on schema-defined properties.
      };
    });

    // Define the exact success response type based on the route schema
    type SuccessResponse = z.infer<
      (typeof getAgentsRoute.responses)[200]["content"]["application/json"]["schema"]
    >;

    const response: SuccessResponse = {
      success: true,
      data: agentDataArray as SuccessResponse["data"], // Ensure data array matches schema
    };

    return c.json(response, 200);
  } catch (error) {
    logger.error("Failed to get agents:", { error });
    return c.json(
      { success: false, error: "Failed to retrieve agents" } satisfies z.infer<typeof ErrorSchema>,
      500,
    );
  }
});

// Get agent by ID
app.get("/agents/:id", (c: ApiContext) => {
  const id = c.req.param("id");
  const registry = AgentRegistry.getInstance();
  const agent = registry.getAgent(id);

  if (!agent) {
    const response: ApiResponse<null> = {
      success: false,
      error: "Agent not found",
    };
    return c.json(response, 404);
  }

  const agentState = agent.getFullState();
  const isTelemetryEnabled = agent.isTelemetryConfigured();

  const response: ApiResponse<AgentResponse> = {
    success: true,
    data: {
      ...agentState,
      status: agentState.status as AgentStatus, // Cast status from fullState
      tools: agent.getToolsForApi() as any, // Assuming getToolsForApi is correctly typed or cast
      subAgents: agentState.subAgents as any, // Assuming subAgents from fullState are correctly typed or cast
      isTelemetryEnabled,
    },
  };

  return c.json(response);
});

// Get agent count
app.get("/agents/count", (c: ApiContext) => {
  const registry = AgentRegistry.getInstance();
  const count = registry.getAgentCount();

  const response: ApiResponse<{ count: number }> = {
    success: true,
    data: { count },
  };

  return c.json(response);
});

// --- Workflow Management Endpoints ---

// Get all workflows
app.openapi(getWorkflowsRoute, (c) => {
  const registry = WorkflowRegistry.getInstance();
  try {
    const workflows = registry.getWorkflowsForApi();

    const response = {
      success: true as const,
      data: workflows,
    };

    return c.json(response, 200);
  } catch (error) {
    logger.error("Failed to get workflows:", { error });
    return c.json({ success: false as const, error: "Failed to retrieve workflows" }, 500);
  }
});

// Get workflow by ID
app.get("/workflows/:id", (c: ApiContext) => {
  const id = c.req.param("id");
  const registry = WorkflowRegistry.getInstance();
  const workflowData = registry.getWorkflowDetailForApi(id);

  if (!workflowData) {
    const response: ApiResponse<null> = {
      success: false,
      error: "Workflow not found",
    };
    return c.json(response, 404);
  }

  // Get the registered workflow to access schemas
  const registeredWorkflow = registry.getWorkflow(id);
  let inputSchema = null;
  let suspendSchema = null;
  let resumeSchema = null;

  if (registeredWorkflow?.inputSchema) {
    try {
      // Convert Zod schema to JSON schema using zodToJsonSchema
      inputSchema = zodSchemaToJsonUI(registeredWorkflow.inputSchema);
    } catch (error) {
      logger.warn("Failed to convert input schema to JSON schema:", { error });
    }
  }

  if (registeredWorkflow?.suspendSchema) {
    try {
      suspendSchema = zodSchemaToJsonUI(registeredWorkflow.suspendSchema);
    } catch (error) {
      logger.warn("Failed to convert suspend schema to JSON schema:", { error });
    }
  }

  if (registeredWorkflow?.resumeSchema) {
    try {
      resumeSchema = zodSchemaToJsonUI(registeredWorkflow.resumeSchema);
    } catch (error) {
      logger.warn("Failed to convert resume schema to JSON schema:", { error });
    }
  }

  // Convert step-level schemas to JSON format
  if (workflowData.steps) {
    workflowData.steps = workflowData.steps.map((step: any) => {
      const convertedStep = { ...step };

      // Convert step schemas if they exist
      if (step.inputSchema) {
        try {
          convertedStep.inputSchema = zodSchemaToJsonUI(step.inputSchema);
        } catch (error) {
          logger.warn(`Failed to convert input schema for step ${step.id}:`, { error });
        }
      }

      if (step.outputSchema) {
        try {
          convertedStep.outputSchema = zodSchemaToJsonUI(step.outputSchema);
        } catch (error) {
          logger.warn(`Failed to convert output schema for step ${step.id}:`, { error });
        }
      }

      if (step.suspendSchema) {
        try {
          convertedStep.suspendSchema = zodSchemaToJsonUI(step.suspendSchema);
        } catch (error) {
          logger.warn(`Failed to convert suspend schema for step ${step.id}:`, { error });
        }
      }

      if (step.resumeSchema) {
        try {
          convertedStep.resumeSchema = zodSchemaToJsonUI(step.resumeSchema);
        } catch (error) {
          logger.warn(`Failed to convert resume schema for step ${step.id}:`, { error });
        }
      }

      return convertedStep;
    });
  }

  const response: ApiResponse<
    typeof workflowData & { inputSchema?: any; suspendSchema?: any; resumeSchema?: any }
  > = {
    success: true,
    data: {
      ...workflowData,
      inputSchema,
      suspendSchema,
      resumeSchema,
    },
  };

  return c.json(response);
});

// Execute workflow
app.openapi(executeWorkflowRoute, async (c) => {
  const { id } = c.req.valid("param") as { id: string };
  const registry = WorkflowRegistry.getInstance();
  const registeredWorkflow = registry.getWorkflow(id);

  if (!registeredWorkflow) {
    return c.json(
      { success: false, error: "Workflow not found" } satisfies z.infer<typeof ErrorSchema>,
      404,
    );
  }

  try {
    const { input, options } = c.req.valid("json") as {
      input: any;
      options?: {
        userId?: string;
        conversationId?: string;
        userContext?: any;
        executionId?: string;
      };
    };

    // Create suspension controller
    const suspendController = registeredWorkflow.workflow.createSuspendController?.();
    if (!suspendController) {
      throw new Error("Workflow does not support suspension");
    }

    // Convert userContext from object to Map if provided
    const processedOptions = options
      ? {
          ...options,
          ...(options.userContext && {
            userContext: new Map(Object.entries(options.userContext)),
          }),
          signal: suspendController.signal, // Add signal for suspension
          suspendController: suspendController, // Add controller for suspension tracking
        }
      : {
          signal: suspendController.signal,
          suspendController: suspendController,
        };

    // Listen for workflow execution creation to capture the execution ID
    let capturedExecutionId: string | null = null;
    const historyCreatedHandler = (historyEntry: any) => {
      if (historyEntry.workflowId === id && !capturedExecutionId) {
        capturedExecutionId = historyEntry.id;
        registry.activeExecutions.set(historyEntry.id, suspendController);
        logger.trace(
          `[API] Captured and stored suspension controller for execution ${historyEntry.id}`,
        );
      }
    };

    registry.on("historyCreated", historyCreatedHandler);

    try {
      // Run the workflow
      logger.trace("[API] Starting workflow execution with signal");
      const result = await registeredWorkflow.workflow.run(input, processedOptions);

      // Remove the listener
      registry.off("historyCreated", historyCreatedHandler);

      // Remove from active executions when complete
      const actualExecutionId = result.executionId;
      registry.activeExecutions.delete(actualExecutionId);
      logger.trace(
        `[API] Workflow execution ${actualExecutionId} completed with status: ${result.status}`,
      );

      const response = {
        success: true as const,
        data: {
          executionId: result.executionId,
          startAt: result.startAt instanceof Date ? result.startAt.toISOString() : result.startAt,
          endAt: result.endAt instanceof Date ? result.endAt.toISOString() : result.endAt,
          status: "completed" as const,
          result: result.result,
        },
      };

      return c.json(response, 200);
    } catch (error) {
      // Remove the listener
      registry.off("historyCreated", historyCreatedHandler);

      // Try to clean up if we captured an execution ID
      if (capturedExecutionId) {
        registry.activeExecutions.delete(capturedExecutionId);
      }

      logger.error("[API] Workflow execution failed:", { error });
      throw error;
    }
  } catch (error) {
    logger.error("Failed to execute workflow:", { error });
    return c.json(
      {
        success: false as const,
        error: error instanceof Error ? error.message : "Failed to execute workflow",
      } satisfies z.infer<typeof ErrorSchema>,
      500,
    );
  }
});

// Get workflow history
app.get("/workflows/:id/history", async (c: ApiContext) => {
  const id = c.req.param("id");
  const page = Number.parseInt(c.req.query("page") || "0");
  const limit = Number.parseInt(c.req.query("limit") || "10");

  const registry = WorkflowRegistry.getInstance();
  const registeredWorkflow = registry.getWorkflow(id);

  if (!registeredWorkflow) {
    const response: ApiResponse<null> = {
      success: false,
      error: "Workflow not found",
    };
    return c.json(response, 404);
  }

  try {
    // Get workflow execution history
    const allExecutions = await registry.getWorkflowExecutionsAsync(id);

    // Sort by startTime descending (most recent first)
    const sortedExecutions = allExecutions.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    );

    // Apply pagination
    const startIndex = page * limit;
    const endIndex = startIndex + limit;
    const paginatedExecutions = sortedExecutions.slice(startIndex, endIndex);

    // Format executions for API response
    const formattedExecutions = paginatedExecutions.map((execution) => ({
      id: execution.id,
      workflowId: execution.workflowId,
      workflowName: execution.workflowName,
      status: execution.status,
      startTime: execution.startTime,
      endTime: execution.endTime,
      input: execution.input,
      output: execution.output,
      steps:
        execution.steps?.map((step) => ({
          stepId: step.stepId,
          stepIndex: step.stepIndex,
          stepType: step.stepType,
          stepName: step.stepName,
          status: step.status,
          startTime: step.startTime,
          endTime: step.endTime,
          input: step.input,
          output: step.output,
          error: step.error,
          agentExecutionId: step.agentExecutionId,
        })) || [],
      events: execution.events, // Always include events in local API
      userId: execution.userId,
      conversationId: execution.conversationId,
      metadata: execution.metadata, // Include metadata for suspension info
    }));

    const response: ApiResponse<{
      executions: typeof formattedExecutions;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }> = {
      success: true,
      data: {
        executions: formattedExecutions,
        pagination: {
          page,
          limit,
          total: sortedExecutions.length,
          totalPages: Math.ceil(sortedExecutions.length / limit),
        },
      },
    };

    return c.json(response);
  } catch (error) {
    logger.error("Failed to get workflow history:", { error });
    const response: ApiResponse<null> = {
      success: false,
      error: "Failed to retrieve workflow history",
    };
    return c.json(response, 500);
  }
});

// Get workflow count
app.get("/workflows/count", (c: ApiContext) => {
  const registry = WorkflowRegistry.getInstance();
  const count = registry.getWorkflowCount();

  const response: ApiResponse<{ count: number }> = {
    success: true,
    data: { count },
  };

  return c.json(response);
});

// Suspend workflow execution
app.openapi(suspendWorkflowRoute, async (c) => {
  const { id, executionId } = c.req.valid("param") as { id: string; executionId: string };
  const registry = WorkflowRegistry.getInstance();

  try {
    const { reason } = c.req.valid("json") as { reason?: string };

    // Find the execution in the registry
    const executions = await registry.getWorkflowExecutionsAsync(id);
    const execution = executions.find((e) => e.id === executionId);

    if (!execution) {
      return c.json(
        { success: false, error: "Workflow execution not found" } satisfies z.infer<
          typeof ErrorSchema
        >,
        404,
      );
    }

    if (execution.status !== "running") {
      return c.json(
        {
          success: false,
          error: `Cannot suspend workflow in ${execution.status} state`,
        } satisfies z.infer<typeof ErrorSchema>,
        400,
      );
    }

    // Trigger suspension via abort signal if available
    logger.trace(`[API] Checking for active execution ${executionId}`, {
      hasExecution: registry.activeExecutions?.has(executionId),
      activeExecutions: Array.from(registry.activeExecutions?.keys() || []),
    });

    if (registry.activeExecutions?.has(executionId)) {
      const controller = registry.activeExecutions.get(executionId);
      logger.trace(`[API] Found suspension controller for execution ${executionId}`, {
        hasController: !!controller,
        isAborted: controller?.signal.aborted,
      });

      if (controller) {
        // Suspend the workflow with reason
        controller.suspend(reason);
        logger.trace(
          `[API] Sent suspend signal to execution ${executionId} with reason: ${reason}`,
        );
      }
    } else {
      logger.warn(`[API] No active execution found for ${executionId}`);
    }

    const response = {
      success: true as const,
      data: {
        executionId,
        status: "suspended" as const,
        suspension: {
          suspendedAt: new Date().toISOString(),
          reason,
        },
      },
    };

    return c.json(response, 200);
  } catch (error) {
    logger.error("Failed to suspend workflow:", { error });
    return c.json(
      {
        success: false as const,
        error: error instanceof Error ? error.message : "Failed to suspend workflow",
      } satisfies z.infer<typeof ErrorSchema>,
      500,
    );
  }
});

// Resume suspended workflow
app.openapi(resumeWorkflowRoute, async (c) => {
  const { id, executionId } = c.req.valid("param") as { id: string; executionId: string };
  const body = c.req.valid("json") as
    | { resumeData?: any; options?: { stepId?: string } }
    | undefined;
  const registry = WorkflowRegistry.getInstance();

  try {
    const result = await registry.resumeSuspendedWorkflow(
      id,
      executionId,
      body?.resumeData,
      body?.options?.stepId,
    );

    if (!result) {
      return c.json(
        {
          success: false,
          error: "Failed to resume workflow - execution not found or not suspended",
        } satisfies z.infer<typeof ErrorSchema>,
        404,
      );
    }

    const response = {
      success: true as const,
      data: {
        executionId: result.executionId,
        startAt: result.startAt instanceof Date ? result.startAt.toISOString() : result.startAt,
        endAt: result.endAt instanceof Date ? result.endAt.toISOString() : result.endAt,
        status: result.status,
        result: result.result,
      },
    };

    return c.json(response, 200);
  } catch (error) {
    logger.error("Failed to resume workflow:", { error });
    return c.json(
      {
        success: false as const,
        error: error instanceof Error ? error.message : "Failed to resume workflow",
      } satisfies z.infer<typeof ErrorSchema>,
      500,
    );
  }
});

// --- Logging Endpoints ---

// Get logs
app.openapi(getLogsRoute, (c) => {
  try {
    const query = c.req.valid("query");
    const logBuffer = getGlobalLogBuffer();

    // Build filter from query parameters
    const filter: LogFilter = {
      level: query.level,
      agentId: query.agentId,
      conversationId: query.conversationId,
      workflowId: query.workflowId,
      executionId: query.executionId,
      since: query.since ? new Date(query.since) : undefined,
      until: query.until ? new Date(query.until) : undefined,
      limit: query.limit,
    };

    const logs = logBuffer.query(filter);

    return c.json(
      {
        success: true as const,
        data: logs,
        total: logs.length,
        query,
      },
      200,
    );
  } catch (error) {
    logger.error("Failed to get logs:", { error });
    return c.json(
      {
        success: false as const,
        error: error instanceof Error ? error.message : "Failed to retrieve logs",
      },
      500,
    );
  }
});

// Get agent history
app.get("/agents/:id/history", async (c: ApiContext) => {
  const id = c.req.param("id");
  const page = Number.parseInt(c.req.query("page") || "0");
  const limit = Number.parseInt(c.req.query("limit") || "10");

  const registry = AgentRegistry.getInstance();
  const agent = registry.getAgent(id);

  if (!agent) {
    const response: ApiResponse<null> = {
      success: false,
      error: "Agent not found",
    };
    return c.json(response, 404);
  }

  try {
    const result = await agent.getHistory({ page, limit });

    const response: ApiResponse<{
      entries: AgentHistoryEntry[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }> = {
      success: true,
      data: {
        entries: result.entries,
        pagination: result.pagination,
      },
    };

    return c.json(response);
  } catch (error) {
    logger.error("Failed to get agent history:", { error });
    const response: ApiResponse<null> = {
      success: false,
      error: "Failed to retrieve agent history",
    };
    return c.json(response, 500);
  }
});

// Generate text response
app.openapi(textRoute, async (c) => {
  const { id } = c.req.valid("param") as { id: string };
  const registry = AgentRegistry.getInstance();
  const agent = registry.getAgent(id);

  if (!agent) {
    return c.json(
      { success: false, error: "Agent not found" } satisfies z.infer<typeof ErrorSchema>,
      404,
    );
  }

  try {
    const { input, options = {} } = c.req.valid("json") as z.infer<typeof TextRequestSchema>;

    // Convert userContext from object to Map if provided
    const processedOptions = {
      ...options,
      ...((options as any).userContext && {
        userContext: new Map(Object.entries((options as any).userContext)),
      }),
    } as any; // Type assertion to bypass userContext type mismatch

    const response = await agent.generateText(input, processedOptions);

    // TODO: Fix this once we can force a change to the response type
    const fixBadResponseTypeForBackwardsCompatibility = response as any;
    return c.json(
      { success: true, data: fixBadResponseTypeForBackwardsCompatibility } satisfies z.infer<
        typeof TextResponseSchema
      >,
      200,
    );
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate text",
      } satisfies z.infer<typeof ErrorSchema>,
      500,
    );
  }
});

// Stream text response
app.openapi(streamRoute, async (c) => {
  const { id } = c.req.valid("param") as { id: string };
  const registry = AgentRegistry.getInstance();
  const agent = registry.getAgent(id);

  if (!agent) {
    return c.json(
      { success: false, error: "Agent not found" } satisfies z.infer<typeof ErrorSchema>,
      404,
    );
  }

  try {
    const {
      input,
      options = {
        maxTokens: 4000,
        temperature: 0.7,
      },
    } = c.req.valid("json") as z.infer<typeof TextRequestSchema>;

    // Create AbortController and connect to request signal
    const abortController = new AbortController();

    // Listen for request abort (when client cancels fetch)
    c.req.raw.signal?.addEventListener("abort", () => {
      abortController.abort();
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Create a flag to track if stream has been closed
          let streamClosed = false;

          // Helper function to safely enqueue data
          const safeEnqueue = (data: string) => {
            if (!streamClosed) {
              try {
                controller.enqueue(new TextEncoder().encode(data));
              } catch (e) {
                logger.error("Failed to enqueue data:", { error: e });
                streamClosed = true;
              }
            }
          };

          // Helper function to safely close stream
          const safeClose = () => {
            if (!streamClosed) {
              try {
                controller.close();
                streamClosed = true;
              } catch (e) {
                logger.error("Failed to close controller:", { error: e });
              }
            }
          };

          // Convert userContext from object to Map if provided
          const processedStreamOptions = {
            ...options,
            ...((options as any).userContext && {
              userContext: new Map(Object.entries((options as any).userContext)),
            }),
            provider: {
              maxTokens: options.maxTokens,
              temperature: options.temperature,
              // Note: No onError callback needed - tool errors are handled via fullStream
              // Stream errors are handled by try/catch blocks around fullStream iteration
            },
            // Pass the abort signal to the agent
            signal: abortController.signal,
          } as any; // Type assertion to bypass userContext type mismatch

          const response = await agent.streamText(input, processedStreamOptions);

          // Iterate through the full stream if available, otherwise fallback to text stream
          try {
            if (response.fullStream) {
              // Use fullStream for rich events (text, tool calls, reasoning, etc.)
              for await (const part of response.fullStream) {
                if (streamClosed) break;

                switch (part.type) {
                  case "text-delta": {
                    const data = {
                      text: part.textDelta,
                      timestamp: new Date().toISOString(),
                      type: "text",
                      // Forward SubAgent metadata if present
                      ...(part.subAgentId &&
                        part.subAgentName && {
                          subAgentId: part.subAgentId,
                          subAgentName: part.subAgentName,
                        }),
                    };
                    const sseMessage = `data: ${JSON.stringify(data)}\n\n`;
                    safeEnqueue(sseMessage);
                    break;
                  }
                  case "reasoning": {
                    const data = {
                      reasoning: part.reasoning,
                      timestamp: new Date().toISOString(),
                      type: "reasoning",
                      // Forward SubAgent metadata if present
                      ...(part.subAgentId &&
                        part.subAgentName && {
                          subAgentId: part.subAgentId,
                          subAgentName: part.subAgentName,
                        }),
                    };
                    const sseMessage = `data: ${JSON.stringify(data)}\n\n`;
                    safeEnqueue(sseMessage);
                    break;
                  }
                  case "source": {
                    const data = {
                      source: part.source,
                      timestamp: new Date().toISOString(),
                      type: "source",
                      // Forward SubAgent metadata if present
                      ...(part.subAgentId &&
                        part.subAgentName && {
                          subAgentId: part.subAgentId,
                          subAgentName: part.subAgentName,
                        }),
                    };
                    const sseMessage = `data: ${JSON.stringify(data)}\n\n`;
                    safeEnqueue(sseMessage);
                    break;
                  }
                  case "tool-call": {
                    const data = {
                      toolCall: {
                        toolCallId: part.toolCallId,
                        toolName: part.toolName,
                        args: part.args,
                      },
                      timestamp: new Date().toISOString(),
                      type: "tool-call",
                      // Forward SubAgent metadata if present
                      ...(part.subAgentId &&
                        part.subAgentName && {
                          subAgentId: part.subAgentId,
                          subAgentName: part.subAgentName,
                        }),
                    };
                    const sseMessage = `data: ${JSON.stringify(data)}\n\n`;
                    safeEnqueue(sseMessage);
                    break;
                  }
                  case "tool-result": {
                    // Send appropriate event type based on error status
                    const data = {
                      toolResult: {
                        toolCallId: part.toolCallId,
                        toolName: part.toolName,
                        result: part.result,
                      },
                      timestamp: new Date().toISOString(),
                      type: "tool-result",
                      // Forward SubAgent metadata if present
                      ...(part.subAgentId &&
                        part.subAgentName && {
                          subAgentId: part.subAgentId,
                          subAgentName: part.subAgentName,
                        }),
                    };
                    const sseMessage = `data: ${JSON.stringify(data)}\n\n`;
                    safeEnqueue(sseMessage);

                    // Don't close stream for tool errors - continue processing
                    break;
                  }
                  case "finish": {
                    const data = {
                      finishReason: part.finishReason,
                      usage: part.usage,
                      timestamp: new Date().toISOString(),
                      type: "finish",
                    };
                    const sseMessage = `data: ${JSON.stringify(data)}\n\n`;
                    safeEnqueue(sseMessage);
                    break;
                  }
                  case "error": {
                    // Check if this is a tool error
                    const error = part.error as any;
                    const isToolError = error?.constructor?.name === "ToolExecutionError";

                    const errorData = {
                      error: (part.error as Error)?.message || "Stream error occurred",
                      timestamp: new Date().toISOString(),
                      type: "error",
                      code: isToolError ? "TOOL_ERROR" : "STREAM_ERROR",
                      // Include tool details if available
                      ...(isToolError && {
                        toolName: error?.toolName,
                        toolCallId: error?.toolCallId,
                      }),
                    };

                    const errorMessage = `data: ${JSON.stringify(errorData)}\n\n`;
                    safeEnqueue(errorMessage);

                    // Don't close stream for tool errors
                    if (!isToolError) {
                      safeClose();
                      return;
                    }
                    break;
                  }
                }
              }
            } else {
              // Fallback to textStream for providers that don't support fullStream
              for await (const textDelta of response.textStream) {
                if (streamClosed) break;

                const data = {
                  text: textDelta,
                  timestamp: new Date().toISOString(),
                  type: "text",
                };
                const sseMessage = `data: ${JSON.stringify(data)}\n\n`;
                safeEnqueue(sseMessage);
              }
            }

            // Stream completed successfully - close without additional event
            // The finish event should already have been sent with usage information
            if (!streamClosed) {
              safeClose();
            }
          } catch (iterationError) {
            // Handle errors during stream iteration
            logger.error("Error during stream iteration:", { error: iterationError });
            const errorData = {
              error: (iterationError as Error)?.message ?? "Stream iteration failed",
              timestamp: new Date().toISOString(),
              type: "error",
              code: "ITERATION_ERROR",
            };
            const errorMessage = `data: ${JSON.stringify(errorData)}\n\n`;
            safeEnqueue(errorMessage);
            safeClose();
          }
        } catch (error) {
          // Handle errors during initial setup
          logger.error("Error during stream setup:", { error });
          const errorData = {
            error: error instanceof Error ? error.message : "Stream setup failed",
            timestamp: new Date().toISOString(),
            type: "error",
            code: "SETUP_ERROR",
          };
          const errorMessage = `data: ${JSON.stringify(errorData)}\n\n`;
          try {
            controller.enqueue(new TextEncoder().encode(errorMessage));
          } catch (e) {
            logger.error("Failed to enqueue setup error message:", { error: e });
          }
          try {
            controller.close();
          } catch (e) {
            logger.error("Failed to close controller after setup error:", { error: e });
          }
        }
      },
      cancel(reason) {
        logger.info("Stream cancelled:", reason);
      },
    });

    return c.body(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to initiate text stream",
      } satisfies z.infer<typeof ErrorSchema>,
      500,
    );
  }
});

// Generate object response
app.openapi(objectRoute, async (c) => {
  const { id } = c.req.valid("param") as { id: string };
  const registry = AgentRegistry.getInstance();
  const agent = registry.getAgent(id);

  if (!agent) {
    return c.json(
      { success: false, error: "Agent not found" } satisfies z.infer<typeof ErrorSchema>,
      404,
    );
  }

  try {
    const {
      input,
      schema,
      options = {},
    } = c.req.valid("json") as z.infer<typeof ObjectRequestSchema>;

    const schemaInZodObject = convertJsonSchemaToZod(schema) as unknown as z.ZodType;

    // Convert userContext from object to Map if provided
    const processedObjectOptions = {
      ...options,
      ...((options as any).userContext && {
        userContext: new Map(Object.entries((options as any).userContext)),
      }),
    } as any; // Type assertion to bypass userContext type mismatch

    const response = await agent.generateObject(input, schemaInZodObject, processedObjectOptions);

    // TODO: Fix this once we can force a change to the response type
    const fixBadResponseTypeForBackwardsCompatibility = response as any;
    return c.json(
      {
        success: true,
        data: fixBadResponseTypeForBackwardsCompatibility,
      } satisfies z.infer<typeof ObjectResponseSchema>,
      200,
    );
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate object",
      } satisfies z.infer<typeof ErrorSchema>,
      500,
    );
  }
});

// Stream object response
app.openapi(streamObjectRoute, async (c) => {
  const { id } = c.req.valid("param") as { id: string };
  const registry = AgentRegistry.getInstance();
  const agent = registry.getAgent(id);

  if (!agent) {
    return c.json(
      { success: false, error: "Agent not found" } satisfies z.infer<typeof ErrorSchema>,
      404,
    );
  }

  try {
    const {
      input,
      schema,
      options = {},
    } = c.req.valid("json") as z.infer<typeof ObjectRequestSchema>;

    const schemaInZodObject = convertJsonSchemaToZod(schema) as unknown as z.ZodType;

    // Create AbortController and connect to request signal
    const abortController = new AbortController();

    // Listen for request abort (when client cancels fetch)
    c.req.raw.signal?.addEventListener("abort", () => {
      logger.info("🛑 API: Client aborted object stream request, stopping agent stream...");
      abortController.abort();
    });

    const sseStream = new ReadableStream({
      async start(controller) {
        try {
          // Create a flag to track if stream has been closed
          let streamClosed = false;

          // Helper function to safely enqueue data
          const safeEnqueue = (data: string) => {
            if (!streamClosed) {
              try {
                controller.enqueue(new TextEncoder().encode(data));
              } catch (e) {
                logger.error("Failed to enqueue data:", { error: e });
                streamClosed = true;
              }
            }
          };

          // Helper function to safely close stream
          const safeClose = () => {
            if (!streamClosed) {
              try {
                controller.close();
                streamClosed = true;
              } catch (e) {
                logger.error("Failed to close controller:", { error: e });
              }
            }
          };

          // Convert userContext from object to Map if provided
          const processedStreamObjectOptions = {
            ...options,
            ...((options as any).userContext && {
              userContext: new Map(Object.entries((options as any).userContext)),
            }),
            provider: {
              ...(options as any).provider,
              // Add onError callback to handle streaming errors
              onError: async (error: any) => {
                logger.error("Object stream error occurred:", { error });
                const errorData = {
                  error: error?.message ?? "Object streaming failed",
                  timestamp: new Date().toISOString(),
                  type: "error",
                  code: error.code || "STREAM_ERROR",
                };
                const errorMessage = `data: ${JSON.stringify(errorData)}\n\n`;
                safeEnqueue(errorMessage);
                safeClose();
              },
            },
            // Pass the abort signal to the agent
            signal: abortController.signal,
          } as any; // Type assertion to bypass userContext type mismatch

          const agentStream = await agent.streamObject(
            input,
            schemaInZodObject,
            processedStreamObjectOptions,
          );

          const reader = agentStream.objectStream.getReader();

          // Iterate through the object stream
          try {
            while (true) {
              if (streamClosed) break;

              const { done, value } = await reader.read();
              if (done) {
                // Send completion message if stream completed successfully
                if (!streamClosed) {
                  const completionData = {
                    done: true,
                    type: "completion",
                    timestamp: new Date().toISOString(),
                  };
                  const completionMessage = `data: ${JSON.stringify(completionData)}\n\n`;
                  safeEnqueue(completionMessage);
                  safeClose();
                }
                break;
              }
              // Since value is already a JavaScript object, we can stringify it directly
              const objectData = {
                object: value,
                timestamp: new Date().toISOString(),
                type: "object",
              };
              const sseMessage = `data: ${JSON.stringify(objectData)}\n\n`;
              safeEnqueue(sseMessage);
            }
          } catch (iterationError) {
            // Handle errors during stream iteration
            logger.error("Error during object stream iteration:", { error: iterationError });
            const errorData = {
              error: (iterationError as Error)?.message ?? "Object stream iteration failed",
              timestamp: new Date().toISOString(),
              type: "error",
              code: "ITERATION_ERROR",
            };
            const errorMessage = `data: ${JSON.stringify(errorData)}\n\n`;
            safeEnqueue(errorMessage);
            safeClose();
          } finally {
            reader.releaseLock();
          }
        } catch (error) {
          // Handle errors during initial setup
          logger.error("Error during object stream setup:", { error });
          const errorData = {
            error: error instanceof Error ? error.message : "Object stream setup failed",
            timestamp: new Date().toISOString(),
            type: "error",
            code: "SETUP_ERROR",
          };
          const errorMessage = `data: ${JSON.stringify(errorData)}\n\n`;
          try {
            controller.enqueue(new TextEncoder().encode(errorMessage));
          } catch (e) {
            logger.error("Failed to enqueue setup error message:", { error: e });
          }
          try {
            controller.close();
          } catch (e) {
            logger.error("Failed to close controller after setup error:", { error: e });
          }
        }
      },
      cancel(reason) {
        logger.info("Object Stream cancelled:", reason);
      },
    });

    return c.body(sseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to initiate object stream",
      } satisfies z.infer<typeof ErrorSchema>,
      500,
    );
  }
});

// Check for updates
app.get("/updates", async (c: ApiContext) => {
  try {
    const forceRefresh = c.req.query("force") === "true";

    // Use cache by default, force refresh if requested
    const updates = await checkForUpdates(undefined, {
      useCache: true,
      forceRefresh,
    });

    // If using cache and not forcing refresh, also trigger background update
    if (!forceRefresh) {
      setImmediate(async () => {
        try {
          await checkForUpdates(undefined, {
            useCache: true,
            forceRefresh: true,
          });
        } catch (error) {
          logger.error("Background update check failed:", { error });
        }
      });
    }

    const response: ApiResponse<{
      hasUpdates: boolean;
      updates: PackageUpdateInfo[];
      count: number;
    }> = {
      success: true,
      data: {
        hasUpdates: updates.hasUpdates,
        updates: updates.updates as any,
        count: updates.count,
      },
    };

    return c.json(response);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to check for updates",
      },
      500,
    );
  }
});

// Perform update for all packages
app.post("/updates", async (c: ApiContext) => {
  try {
    const result = await updateAllPackages();

    return c.json({
      success: result.success,
      data: {
        message: result.message,
        updatedPackages: result.updatedPackages || [],
        updatedAt: new Date().toISOString(),
        requiresRestart: result.requiresRestart,
      },
    });
  } catch (error) {
    logger.error("Failed to update all packages:", { error });
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to perform update",
      },
      500,
    );
  }
});

// Update single package
app.post("/updates/:packageName", async (c: ApiContext) => {
  try {
    const packageName = c.req.param("packageName");

    const result = await updateSinglePackage(packageName);

    return c.json({
      success: result.success,
      data: {
        message: result.message,
        packageName: result.packageName,
        updatedAt: new Date().toISOString(),
        requiresRestart: result.requiresRestart,
      },
    });
  } catch (error) {
    logger.error("Failed to update package:", { error });
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update package",
      },
      500,
    );
  }
});

// Setup observability endpoint
app.post("/setup-observability", async (c: ApiContext) => {
  try {
    const body = await c.req.json();
    const { publicKey, secretKey } = body;

    if (!publicKey || !secretKey) {
      return c.json(
        {
          success: false,
          error: "Missing publicKey or secretKey",
        },
        400,
      );
    }

    // Update .env file
    const envPath = path.join(process.cwd(), ".env");

    try {
      // Read existing .env content
      let envContent = "";
      try {
        envContent = await fs.readFile(envPath, "utf-8");
      } catch (_error) {
        // If .env doesn't exist, we'll create it
        logger.debug(".env file not found, will create new one");
      }

      // Update or add keys
      const lines = envContent.split("\n");
      let publicKeyUpdated = false;
      let secretKeyUpdated = false;

      const updatedLines = lines.map((line) => {
        const trimmedLine = line.trim();

        // Update existing or commented public key
        if (
          trimmedLine.startsWith("VOLTAGENT_PUBLIC_KEY=") ||
          trimmedLine.startsWith("# VOLTAGENT_PUBLIC_KEY=") ||
          trimmedLine.startsWith("#VOLTAGENT_PUBLIC_KEY=")
        ) {
          publicKeyUpdated = true;
          return `VOLTAGENT_PUBLIC_KEY=${publicKey}`;
        }

        // Update existing or commented secret key
        if (
          trimmedLine.startsWith("VOLTAGENT_SECRET_KEY=") ||
          trimmedLine.startsWith("# VOLTAGENT_SECRET_KEY=") ||
          trimmedLine.startsWith("#VOLTAGENT_SECRET_KEY=")
        ) {
          secretKeyUpdated = true;
          return `VOLTAGENT_SECRET_KEY=${secretKey}`;
        }

        return line;
      });

      envContent = updatedLines.join("\n");

      // If keys weren't found, add them at the end
      if (!publicKeyUpdated || !secretKeyUpdated) {
        if (!envContent.endsWith("\n") && envContent.length > 0) {
          envContent += "\n";
        }

        if (!publicKeyUpdated && !secretKeyUpdated) {
          envContent += `
# VoltAgent Observability
VOLTAGENT_PUBLIC_KEY=${publicKey}
VOLTAGENT_SECRET_KEY=${secretKey}
`;
        } else if (!publicKeyUpdated) {
          envContent += `VOLTAGENT_PUBLIC_KEY=${publicKey}\n`;
        } else if (!secretKeyUpdated) {
          envContent += `VOLTAGENT_SECRET_KEY=${secretKey}\n`;
        }
      }

      // Write updated content
      await fs.writeFile(envPath, envContent);

      logger.info("Observability configuration updated in .env file");

      return c.json({
        success: true,
        message: "Observability configured successfully. Please restart your application.",
      });
    } catch (error) {
      logger.error("Failed to update .env file:", { error });
      return c.json(
        {
          success: false,
          error: "Failed to update .env file",
        },
        500,
      );
    }
  } catch (error) {
    logger.error("Failed to setup observability:", { error });
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to setup observability",
      },
      500,
    );
  }
});

// OpenAPI Documentation Endpoints

// The OpenAPI specification endpoint
app.doc("/doc", {
  openapi: "3.1.0",
  info: {
    version: "1.0.0",
    title: "VoltAgent Core API",
    description: "API for managing and interacting with VoltAgents",
  },
  servers: [{ url: "http://localhost:3141", description: "Local development server" }],
});

/**
 * Register a single custom endpoint with the API server
 * @param endpoint The custom endpoint definition
 * @throws CustomEndpointError if the endpoint definition is invalid or registration fails
 */
export function registerCustomEndpoint(endpoint: CustomEndpointDefinition): void {
  try {
    // Validate the endpoint
    const validatedEndpoint = validateCustomEndpoint(endpoint);
    const { path, method, handler } = validatedEndpoint;

    // Register the endpoint with the app
    switch (method) {
      case "get":
        app.get(path, handler);
        break;
      case "post":
        app.post(path, handler);
        break;
      case "put":
        app.put(path, handler);
        break;
      case "patch":
        app.patch(path, handler);
        break;
      case "delete":
        app.delete(path, handler);
        break;
      case "options":
        app.options(path, handler);
        break;
      default:
        throw new CustomEndpointError(`Unsupported HTTP method: ${method}`);
    }

    // Store registered endpoint for later display in server startup (accumulate, don't override)
    if (!(global as any).__voltAgentCustomEndpoints) {
      (global as any).__voltAgentCustomEndpoints = [];
    }
    (global as any).__voltAgentCustomEndpoints.push(validatedEndpoint);
  } catch (error) {
    if (error instanceof CustomEndpointError) {
      throw error;
    }
    throw new CustomEndpointError(
      `Failed to register custom endpoint: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Register multiple custom endpoints with the API server
 * @param endpoints Array of custom endpoint definitions
 * @throws CustomEndpointError if any endpoint definition is invalid or registration fails
 */
export function registerCustomEndpoints(endpoints: CustomEndpointDefinition[]): void {
  try {
    // Validate all endpoints first
    const validatedEndpoints = validateCustomEndpoints(endpoints);

    if (validatedEndpoints.length === 0) {
      return;
    }

    // Register each endpoint quietly
    for (const endpoint of validatedEndpoints) {
      const { path, method, handler } = endpoint;

      // Register the endpoint with the app (without individual logging)
      switch (method) {
        case "get":
          app.get(path, handler);
          break;
        case "post":
          app.post(path, handler);
          break;
        case "put":
          app.put(path, handler);
          break;
        case "patch":
          app.patch(path, handler);
          break;
        case "delete":
          app.delete(path, handler);
          break;
        case "options":
          app.options(path, handler);
          break;
        default:
          throw new CustomEndpointError(`Unsupported HTTP method: ${method}`);
      }
    }

    // Store registered endpoints for later display in server startup (accumulate, don't override)
    if (!(global as any).__voltAgentCustomEndpoints) {
      (global as any).__voltAgentCustomEndpoints = [];
    }
    (global as any).__voltAgentCustomEndpoints.push(...validatedEndpoints);
  } catch (error) {
    if (error instanceof CustomEndpointError) {
      throw error;
    }
    throw new CustomEndpointError(
      `Failed to register custom endpoints: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export { app as default };

// Create WebSocket server
export const createWebSocketServer = () => {
  const wss = new WebSocketServer({ noServer: true });

  // Subscribe to agent history updates
  AgentEventEmitter.getInstance().onHistoryUpdate((agentId, historyEntry) => {
    const connections = agentConnections.get(agentId);
    if (!connections) return;

    // Extract the sequence number added by the emitter
    const sequenceNumber = historyEntry._sequenceNumber || Date.now();

    const message = JSON.stringify({
      type: "HISTORY_UPDATE",
      success: true,
      sequenceNumber,
      data: historyEntry,
    });

    connections.forEach((ws) => {
      if (ws.readyState === 1) {
        // WebSocket.OPEN
        ws.send(message);
      }
    });
  });

  // ✅ CLEAN: Workflow events now use WORKFLOW_HISTORY_UPDATE via WorkflowRegistry
  // No need for separate WORKFLOW_EVENT_UPDATE - WorkflowRegistry handles this via historyUpdate events

  // Subscribe to new agent history entry created events
  AgentEventEmitter.getInstance().onHistoryEntryCreated((agentId, historyEntry) => {
    const connections = agentConnections.get(agentId);
    if (!connections) return;

    const message = JSON.stringify({
      type: "HISTORY_CREATED",
      success: true,
      data: historyEntry,
    });

    connections.forEach((ws) => {
      if (ws.readyState === 1) {
        // WebSocket.OPEN
        ws.send(message);
      }
    });
  });

  // Subscribe to workflow registry events
  const workflowRegistry = WorkflowRegistry.getInstance();

  // Subscribe to workflow history created events
  workflowRegistry.on("historyCreated", (historyEntry) => {
    const connections = workflowConnections.get(historyEntry.workflowId);
    if (!connections) return;

    const message = JSON.stringify({
      type: "WORKFLOW_HISTORY_CREATED",
      success: true,
      data: historyEntry,
    });

    connections.forEach((ws) => {
      if (ws.readyState === 1) {
        ws.send(message);
      }
    });
  });

  // Subscribe to workflow history update events
  workflowRegistry.on("historyUpdate", (_executionId, historyEntry) => {
    const connections = workflowConnections.get(historyEntry.workflowId);
    if (!connections) return;

    const message = JSON.stringify({
      type: "WORKFLOW_HISTORY_UPDATE",
      success: true,
      data: historyEntry,
    });

    connections.forEach((ws) => {
      if (ws.readyState === 1) {
        ws.send(message);
      }
    });
  });

  wss.on("connection", async (ws, req) => {
    // Extract agent ID from URL - new URL structure /ws/agents/:id
    const url = new URL(req.url || "", "ws://localhost");
    const pathParts = url.pathname.split("/");

    if (url.pathname === "/ws") {
      // Send a test message when connection is established
      ws.send(
        JSON.stringify({
          type: "CONNECTION_TEST",
          success: true,
          data: {
            message: "WebSocket test connection successful",
            timestamp: new Date().toISOString(),
          },
        }),
      );

      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());
          // Echo the message back
          ws.send(
            JSON.stringify({
              type: "ECHO",
              success: true,
              data,
            }),
          );
        } catch (error) {
          logger.error("[WebSocket] Failed to parse message:", { error });
        }
      });

      return;
    }

    // Handle different WebSocket paths
    if (pathParts[2] === "logs") {
      // /ws/logs - Real-time log streaming
      const query = Object.fromEntries(url.searchParams.entries());
      const filter: LogFilter = {
        level: query.level as any,
        agentId: query.agentId,
        conversationId: query.conversationId,
        workflowId: query.workflowId,
        executionId: query.executionId,
        since: query.since ? new Date(query.since) : undefined,
        until: query.until ? new Date(query.until) : undefined,
        limit: query.limit ? Number.parseInt(query.limit) : undefined,
      };

      logStreamManager.addClient(ws, filter);

      return;
    }

    if (pathParts[2] === "workflows" && pathParts.length >= 4) {
      // /ws/workflows/:id
      const workflowId = decodeURIComponent(pathParts[3]);

      // Add connection to the workflow's connection set
      if (!workflowConnections.has(workflowId)) {
        workflowConnections.set(workflowId, new Set());
      }
      workflowConnections.get(workflowId)?.add(ws);

      // Get workflow and send initial state
      const registeredWorkflow = WorkflowRegistry.getInstance().getWorkflow(workflowId);
      if (registeredWorkflow) {
        // Get workflow execution history
        const history = await WorkflowRegistry.getInstance().getWorkflowExecutionsAsync(workflowId);

        if (history && history.length > 0) {
          // Send all history entries
          ws.send(
            JSON.stringify({
              type: "WORKFLOW_HISTORY_LIST",
              success: true,
              data: history.map((entry) => ({
                ...entry,
                // ✅ UNIFIED: Handle both Date objects and ISO strings for history list
                startTime:
                  entry.startTime instanceof Date ? entry.startTime.toISOString() : entry.startTime,
                endTime:
                  entry.endTime instanceof Date ? entry.endTime.toISOString() : entry.endTime,
              })),
            }),
          );

          // Send active execution if exists
          const activeExecution = history.find((entry) => entry.status === "running");
          if (activeExecution) {
            ws.send(
              JSON.stringify({
                type: "WORKFLOW_HISTORY_UPDATE",
                success: true,
                data: activeExecution,
              }),
            );
          }
        }

        // Send initial workflow state
        ws.send(
          JSON.stringify({
            type: "WORKFLOW_STATE",
            success: true,
            data: {
              workflow: {
                id: registeredWorkflow.workflow.id,
                name: registeredWorkflow.workflow.name,
                purpose: registeredWorkflow.workflow.purpose,
                status: "idle",
              },
            },
          }),
        );
      }

      ws.on("close", () => {
        // Remove connection from the workflow's connection set
        workflowConnections.get(workflowId)?.delete(ws);
        if (workflowConnections.get(workflowId)?.size === 0) {
          workflowConnections.delete(workflowId);
        }
      });

      return;
    }

    // Handle agent WebSocket connections
    // New URL structure: /ws/agents/:id
    // ["", "ws", "agents", ":id"]
    const agentId =
      pathParts.length >= 4 && pathParts[2] === "agents" ? decodeURIComponent(pathParts[3]) : null;

    if (!agentId) {
      ws.close();
      return;
    }

    // Add connection to the agent's connection set
    if (!agentConnections.has(agentId)) {
      agentConnections.set(agentId, new Set());
    }
    agentConnections.get(agentId)?.add(ws);

    // Get agent and send initial full state
    const agent = AgentRegistry.getInstance().getAgent(agentId);
    if (agent) {
      // Get first page of history - needs await
      const result = await agent.getHistory({ page: 0, limit: 20 });

      if (result && result.entries.length > 0) {
        // Send first page of history entries with pagination info
        ws.send(
          JSON.stringify({
            type: "HISTORY_LIST",
            success: true,
            data: result.entries,
            pagination: result.pagination,
          }),
        );

        // Also check if there's an active history entry and send it individually
        const activeHistory = result.entries.find(
          (entry: AgentHistoryEntry) => entry.status !== "completed" && entry.status !== "error",
        );

        if (activeHistory) {
          ws.send(
            JSON.stringify({
              type: "HISTORY_UPDATE",
              success: true,
              data: activeHistory,
            }),
          );
        }
      }
    }

    ws.on("close", () => {
      // Remove connection from the agent's connection set
      agentConnections.get(agentId)?.delete(ws);
      if (agentConnections.get(agentId)?.size === 0) {
        agentConnections.delete(agentId);
      }
    });

    ws.on("error", (error) => {
      logger.error("[WebSocket] Error:", { error });
    });
  });

  return wss;
};

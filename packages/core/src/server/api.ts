import { Hono } from "hono";
import { cors } from "hono/cors";
import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import { z } from "zod";
import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import type { AgentHistoryEntry } from "../agent/history";
import { AgentEventEmitter } from "../events";
import { AgentRegistry } from "./registry";
import type { AgentResponse, ApiContext, ApiResponse } from "./types";
import type { AgentStatus } from "../agent/types";
import {
  checkForUpdates,
  updateAllPackages,
  updateSinglePackage,
  type PackageUpdateInfo,
} from "../utils/update";
import {
  getAgentsRoute,
  textRoute,
  streamRoute,
  objectRoute,
  streamObjectRoute,
  type ErrorSchema,
  type TextResponseSchema,
  type ObjectResponseSchema,
  type AgentResponseSchema,
  type TextRequestSchema,
  type ObjectRequestSchema,
} from "./api.routes";

const app = new OpenAPIHono();

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
            <p>Manage and monitor your agents via the Developer Console.</p>
            <a href="https://console.voltagent.dev" target="_blank" style="margin-bottom: 30px; display: inline-block;">Go to Developer Console</a>
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
  const agents = registry.getAllAgents();

  try {
    const responseData = agents.map((agent) => {
      const fullState = agent.getFullState();

      // Ensure subAgents conform to the AgentResponse type
      return {
        ...fullState,
        status: fullState.status as AgentStatus, // Cast status
        tools: agent.getToolsForApi(),
        subAgents:
          fullState.subAgents?.map((subAgent: any) => ({
            id: subAgent.id || "",
            name: subAgent.name || "",
            description: subAgent.description || "",
            status: (subAgent.status as AgentStatus) || "idle", // Cast status
            model: subAgent.model || "",
            tools: subAgent.tools || [],
            memory: subAgent.memory,
          })) || [],
      } as z.infer<typeof AgentResponseSchema>; // Assert type conformance
    });

    const response = {
      success: true,
      data: responseData,
    } satisfies z.infer<
      (typeof getAgentsRoute.responses)[200]["content"]["application/json"]["schema"]
    >; // Use satisfies

    return c.json(response);
  } catch (error) {
    console.error("Failed to get agents:", error);
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

  const response: ApiResponse<AgentResponse> = {
    success: true,
    data: {
      ...agent.getFullState(),
      status: agent.getFullState().status as AgentStatus,
      tools: agent.getToolsForApi() as any,
      subAgents: agent.getFullState().subAgents as any,
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

// Get agent history
app.get("/agents/:id/history", async (c: ApiContext) => {
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

  const history = await agent.getHistory();

  const response: ApiResponse<AgentHistoryEntry[]> = {
    success: true,
    data: history,
  };

  return c.json(response);
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

    const response = await agent.generateText(input, options);
    return c.json({ success: true, data: response } satisfies z.infer<typeof TextResponseSchema>);
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
    const { input, options = {} } = c.req.valid("json") as z.infer<typeof TextRequestSchema>;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await agent.streamText(input, {
            ...options,
          });

          for await (const chunk of response.textStream) {
            const data = {
              text: chunk,
              timestamp: new Date().toISOString(),
              type: "text",
            };
            const sseMessage = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(new TextEncoder().encode(sseMessage));
          }

          const completionData = {
            done: true,
            timestamp: new Date().toISOString(),
            type: "completion",
          };
          const completionMessage = `data: ${JSON.stringify(completionData)}\n\n`;
          controller.enqueue(new TextEncoder().encode(completionMessage));
          controller.close();
        } catch (error) {
          const errorData = {
            error: error instanceof Error ? error.message : "Streaming failed",
            timestamp: new Date().toISOString(),
            type: "error",
          };
          const errorMessage = `data: ${JSON.stringify(errorData)}\n\n`;
          try {
            controller.enqueue(new TextEncoder().encode(errorMessage));
          } catch (e) {
            console.error("Failed to enqueue error message:", e);
          }
          try {
            controller.close();
          } catch (e) {
            console.error("Failed to close controller after error:", e);
          }
        }
      },
      cancel(reason) {
        console.log("Stream cancelled:", reason);
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

    const response = await agent.generateObject(input, schema, options);
    return c.json({ success: true, data: response } satisfies z.infer<typeof ObjectResponseSchema>);
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

    const agentStream = await agent.streamObject(input, schema, options);

    const sseStream = new ReadableStream({
      async start(controller) {
        const reader = agentStream.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              const completionData = {
                done: true,
                type: "completion",
                timestamp: new Date().toISOString(),
              };
              controller.enqueue(`data: ${JSON.stringify(completionData)}\n\n`);
              break;
            }
            const chunkString = decoder.decode(value, { stream: true });
            controller.enqueue(`data: ${chunkString}\n\n`);
          }
          controller.close();
        } catch (error) {
          const errorData = {
            error: error instanceof Error ? error.message : "Object streaming failed",
            type: "error",
            timestamp: new Date().toISOString(),
          };
          try {
            controller.enqueue(`data: ${JSON.stringify(errorData)}\n\n`);
          } catch (e) {
            console.error("Failed to enqueue error message:", e);
          }
          try {
            controller.close();
          } catch (e) {
            console.error("Failed to close controller after error:", e);
          }
        } finally {
          reader.releaseLock();
        }
      },
      cancel(reason) {
        console.log("Object Stream cancelled:", reason);
        agentStream.cancel(reason);
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
    const updates = await checkForUpdates();

    // npm-check package directly provides the bump value (major, minor, patch)
    // We can use the data as is
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
      },
    });
  } catch (error) {
    console.error("Failed to update all packages:", error);
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
      },
    });
  } catch (error) {
    console.error("Failed to update package:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update package",
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

// Swagger UI endpoint
app.get("/ui", swaggerUI({ url: "/doc" }));

export { app as default };

// Create WebSocket server
export const createWebSocketServer = () => {
  const wss = new WebSocketServer({ noServer: true });

  // Subscribe to history updates
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

  // Subscribe to new history entry created events
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
          console.error("[WebSocket] Failed to parse message:", error);
        }
      });

      return;
    }

    // New URL structure: /ws/agents/:id
    // ["", "ws", "agents", ":id"]
    const agentId = pathParts.length >= 4 ? decodeURIComponent(pathParts[3]) : null;

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
      // Get history - needs await
      const history = await agent.getHistory();

      if (history && history.length > 0) {
        // Send all history entries in one message
        ws.send(
          JSON.stringify({
            type: "HISTORY_LIST",
            success: true,
            data: history,
          }),
        );

        // Also check if there's an active history entry and send it individually
        const activeHistory = history.find(
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
      console.error("[WebSocket] Error:", error);
    });
  });

  return wss;
};

/**
 * Framework-agnostic WebSocket handlers for server implementations
 */

import type { IncomingMessage } from "node:http";
import type { ServerProviderDeps } from "@voltagent/core";
import type { AgentHistoryEntry, WorkflowHistoryEntry } from "@voltagent/core";
import type { LogFilter, Logger } from "@voltagent/internal";
import type { IWebSocket } from "../types/websocket";
import { LogStreamManager } from "./log-stream";

// Store WebSocket connections for each agent
const agentConnections = new Map<string, Set<IWebSocket>>();
// Store WebSocket connections for each workflow
const workflowConnections = new Map<string, Set<IWebSocket>>();
// Log stream manager instance
const logStreamManager = new LogStreamManager();

// Track if event listeners are initialized
let eventListenersInitialized = false;
let workflowListenersInitialized = false;

/**
 * Setup agent event listeners
 */
function setupAgentEventListeners(
  agentEventEmitter: NonNullable<ServerProviderDeps["agentEventEmitter"]>,
) {
  if (eventListenersInitialized) return;

  // Subscribe to agent history updates
  agentEventEmitter.onHistoryUpdate(
    (agentId: string, historyEntry: AgentHistoryEntry & { _sequenceNumber?: number }) => {
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
    },
  );

  // Subscribe to new agent history entry created events
  agentEventEmitter.onHistoryEntryCreated((agentId: string, historyEntry: AgentHistoryEntry) => {
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

  eventListenersInitialized = true;
}

/**
 * Setup workflow event listeners
 */
function setupWorkflowEventListeners(workflowRegistry: ServerProviderDeps["workflowRegistry"]) {
  if (workflowListenersInitialized) return;

  // Subscribe to workflow history created events
  workflowRegistry.on("historyCreated", (historyEntry: unknown) => {
    const entry = historyEntry as { workflowId: string };
    const connections = workflowConnections.get(entry.workflowId);
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
  workflowRegistry.on("historyUpdate", (_executionId: string, historyEntry: unknown) => {
    const entry = historyEntry as { workflowId: string };
    const connections = workflowConnections.get(entry.workflowId);
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

  workflowListenersInitialized = true;
}

/**
 * Main WebSocket connection handler - framework agnostic
 */
export async function handleWebSocketConnection(
  ws: IWebSocket,
  req: IncomingMessage,
  deps: ServerProviderDeps,
  logger: Logger,
): Promise<void> {
  const { agentRegistry, workflowRegistry, agentEventEmitter } = deps;

  // Setup agent event listeners if provided
  if (agentEventEmitter && !eventListenersInitialized) {
    setupAgentEventListeners(agentEventEmitter);
  }

  // Setup workflow event listeners once per deps instance
  if (!workflowListenersInitialized && workflowRegistry) {
    setupWorkflowEventListeners(workflowRegistry);
  }

  // Extract path from URL
  const url = new URL(req.url || "", "ws://localhost");
  const pathParts = url.pathname.split("/");

  // Handle test connection
  if (url.pathname === "/ws") {
    handleTestConnection(ws, logger);
    return;
  }

  // Handle different WebSocket paths
  if (pathParts[2] === "logs") {
    handleLogStream(ws, url, logger);
    return;
  }

  if (pathParts[2] === "workflows" && pathParts.length >= 4) {
    await handleWorkflowConnection(ws, pathParts[3], workflowRegistry, logger);
    return;
  }

  // Handle agent WebSocket connections
  if (pathParts.length >= 4 && pathParts[2] === "agents") {
    await handleAgentConnection(ws, pathParts[3], agentRegistry, logger);
    return;
  }

  // Invalid path - close connection
  ws.close();
}

/**
 * Handle test WebSocket connection
 */
function handleTestConnection(ws: IWebSocket, logger: Logger): void {
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
}

/**
 * Handle log stream WebSocket connection
 */
function handleLogStream(ws: IWebSocket, url: URL, _logger: Logger): void {
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
}

/**
 * Handle workflow WebSocket connection
 */
async function handleWorkflowConnection(
  ws: IWebSocket,
  workflowId: string,
  workflowRegistry: ServerProviderDeps["workflowRegistry"],
  _logger: Logger,
): Promise<void> {
  const decodedWorkflowId = decodeURIComponent(workflowId);

  // Add connection to the workflow's connection set
  if (!workflowConnections.has(decodedWorkflowId)) {
    workflowConnections.set(decodedWorkflowId, new Set());
  }
  workflowConnections.get(decodedWorkflowId)?.add(ws);

  // Get workflow and send initial state
  const registeredWorkflow = workflowRegistry.getWorkflow(decodedWorkflowId);
  if (registeredWorkflow) {
    // Get workflow execution history
    const history: WorkflowHistoryEntry[] =
      await workflowRegistry.getWorkflowExecutionsAsync(decodedWorkflowId);

    if (history && history.length > 0) {
      // Send all history entries
      ws.send(
        JSON.stringify({
          type: "WORKFLOW_HISTORY_LIST",
          success: true,
          data: history.map((entry) => ({
            ...entry,
            startTime:
              entry.startTime instanceof Date ? entry.startTime.toISOString() : entry.startTime,
            endTime: entry.endTime instanceof Date ? entry.endTime.toISOString() : entry.endTime,
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
    const workflowReg = registeredWorkflow as {
      workflow?: { id: string; name: string; purpose?: string };
    } & { id?: string; name?: string; purpose?: string };
    const workflowData = workflowReg.workflow || workflowReg;

    ws.send(
      JSON.stringify({
        type: "WORKFLOW_STATE",
        success: true,
        data: {
          workflow: {
            id: workflowData.id || "",
            name: workflowData.name || "",
            purpose: workflowData.purpose || "",
            status: "idle",
          },
        },
      }),
    );
  }

  ws.on("close", () => {
    // Remove connection from the workflow's connection set
    workflowConnections.get(decodedWorkflowId)?.delete(ws);
    if (workflowConnections.get(decodedWorkflowId)?.size === 0) {
      workflowConnections.delete(decodedWorkflowId);
    }
  });
}

/**
 * Handle agent WebSocket connection
 */
async function handleAgentConnection(
  ws: IWebSocket,
  agentId: string,
  agentRegistry: ServerProviderDeps["agentRegistry"],
  logger: Logger,
): Promise<void> {
  const decodedAgentId = decodeURIComponent(agentId);

  // Add connection to the agent's connection set
  if (!agentConnections.has(decodedAgentId)) {
    agentConnections.set(decodedAgentId, new Set());
  }
  agentConnections.get(decodedAgentId)?.add(ws);

  // Get agent and send initial full state
  const agent = agentRegistry.getAgent(decodedAgentId);
  if (agent) {
    logger.debug(`[WebSocket] Agent found for ${decodedAgentId}, fetching history...`);

    // Get first page of history
    const result = await agent.getHistory({ page: 0, limit: 20 });

    logger.debug(`[WebSocket] History result for ${decodedAgentId}:`, {
      hasResult: !!result,
      entriesCount: result?.entries?.length || 0,
      pagination: result?.pagination,
    });

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
    } else {
      logger.debug(`[WebSocket] No history entries found for agent ${decodedAgentId}`);
    }
  } else {
    logger.warn(`[WebSocket] Agent not found for ${decodedAgentId}`);
  }

  ws.on("close", () => {
    // Remove connection from the agent's connection set
    agentConnections.get(decodedAgentId)?.delete(ws);
    if (agentConnections.get(decodedAgentId)?.size === 0) {
      agentConnections.delete(decodedAgentId);
    }
  });

  ws.on("error", (error) => {
    logger.error("[WebSocket] Error:", { error });
  });
}

/**
 * Clean up all WebSocket connections
 */
export function cleanupWebSockets(): void {
  // Close all agent connections
  for (const connections of agentConnections.values()) {
    for (const ws of connections) {
      ws.close();
    }
  }
  agentConnections.clear();

  // Close all workflow connections
  for (const connections of workflowConnections.values()) {
    for (const ws of connections) {
      ws.close();
    }
  }
  workflowConnections.clear();

  // Clean up log stream manager
  logStreamManager.removeAllClients();
}

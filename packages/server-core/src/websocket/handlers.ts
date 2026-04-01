/**
 * Framework-agnostic WebSocket handlers for server implementations
 */

import type { IncomingMessage } from "node:http";
import type { ServerProviderDeps } from "@voltagent/core";
import { type LogFilter, type Logger, safeStringify } from "@voltagent/internal";
import type { IWebSocket } from "../types/websocket";
import { LogStreamManager } from "./log-stream";
import { handleObservabilityConnection } from "./observability-handler";

// Log stream manager instance
const logStreamManager = new LogStreamManager();

/**
 * Main WebSocket connection handler - framework agnostic
 */
export async function handleWebSocketConnection(
  ws: IWebSocket,
  req: IncomingMessage,
  deps: ServerProviderDeps,
  logger: Logger,
  user?: any,
): Promise<void> {
  // Extract path from URL
  const url = new URL(req.url || "", "ws://localhost");
  const pathParts = url.pathname.split("/");

  // Handle test connection
  if (url.pathname === "/ws") {
    handleTestConnection(ws, logger, user);
    return;
  }

  // Handle different WebSocket paths
  if (pathParts[2] === "logs") {
    handleLogStream(ws, url, logger, user);
    return;
  }

  if (pathParts[2] === "observability") {
    handleObservabilityConnection(ws, req, deps, user);
    return;
  }

  // Workflow WebSocket removed - workflows now use observability WebSocket
  // Agent WebSocket removed - agents now use observability WebSocket

  // Invalid path - close connection
  ws.close();
}

/**
 * Handle test WebSocket connection
 */
function handleTestConnection(ws: IWebSocket, logger: Logger, user?: any): void {
  // Send a test message when connection is established
  ws.send(
    safeStringify({
      type: "CONNECTION_TEST",
      success: true,
      data: {
        message: "WebSocket test connection successful",
        timestamp: new Date().toISOString(),
        authenticated: !!user,
        userId: user?.id,
      },
    }),
  );

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      // Echo the message back
      ws.send(
        safeStringify({
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
function handleLogStream(ws: IWebSocket, url: URL, _logger: Logger, _user?: any): void {
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
 * Clean up all WebSocket connections
 */
export function cleanupWebSockets(): void {
  // Clean up log stream manager
  logStreamManager.removeAllClients();
}

/**
 * WebSocket handler for Observability events
 * Bridges OpenTelemetry span events to the Console UI
 */

import type { ServerProviderDeps } from "@voltagent/core";
import { WebSocketEventEmitter, WebSocketLogProcessor } from "@voltagent/core";
import type { ObservabilityLogRecord, ObservabilityWebSocketEvent } from "@voltagent/core";
import { safeStringify } from "@voltagent/internal";
import type { IWebSocket } from "../types/websocket";

// Store WebSocket connections with their filter criteria
interface ObservabilityConnection {
  ws: IWebSocket;
  entityId?: string; // Optional entity filter
  entityType?: "agent" | "workflow"; // Optional entity type filter
}

// Store WebSocket connections for observability
const observabilityConnections = new Map<IWebSocket, ObservabilityConnection>();

// Track if listeners are initialized
let observabilityListenersInitialized = false;

// Store log unsubscribe function
let logUnsubscribe: (() => void) | null = null;

/**
 * Get the WebSocketEventEmitter singleton
 * This is the same instance used by WebSocketSpanProcessor
 */
function getWebSocketEventEmitter(): WebSocketEventEmitter {
  return WebSocketEventEmitter.getInstance();
}

/**
 * Setup observability event listeners
 */
export function setupObservabilityListeners(): void {
  if (observabilityListenersInitialized) {
    return;
  }

  const emitter = getWebSocketEventEmitter();

  // Subscribe to WebSocket events from OpenTelemetry spans
  emitter.on("websocket:event", (event: ObservabilityWebSocketEvent) => {
    const message = safeStringify({
      type: "OBSERVABILITY_EVENT",
      success: true,
      data: event,
    });

    // Broadcast to connected observability clients with filtering
    observabilityConnections.forEach((connection) => {
      if (connection.ws.readyState === 1) {
        // WebSocket.OPEN
        // Check if event matches entity filter
        if (connection.entityId) {
          // Check if this is a root span (no parent) or a child span
          const isRootSpan = !event.span?.parentSpanId;

          if (isRootSpan) {
            // For root spans, check entity.id
            const eventEntityId = event.span?.attributes?.["entity.id"];
            const eventEntityType = event.span?.attributes?.["entity.type"];
            const spanType = event.span?.attributes?.["span.type"];

            // Always forward trigger root spans so agent filters still see them
            const isTriggerSpan = spanType === "trigger";

            // Filter by entity ID
            if (!isTriggerSpan && eventEntityId !== connection.entityId) {
              return; // Skip this connection
            }

            // Additionally filter by type if specified
            if (
              !isTriggerSpan &&
              connection.entityType &&
              eventEntityType !== connection.entityType
            ) {
              return; // Skip if type doesn't match
            }
          }
          // For child spans, don't filter - they'll be included automatically
          // This ensures all child spans (agents, tools, etc.) are visible
        }
        connection.ws.send(message);
      }
    });
  });

  // Subscribe to log events from WebSocketLogProcessor
  logUnsubscribe = WebSocketLogProcessor.subscribe((logRecord: ObservabilityLogRecord) => {
    const message = safeStringify({
      type: "OBSERVABILITY_LOG",
      success: true,
      data: logRecord,
    });

    // Broadcast to connected observability clients with filtering
    observabilityConnections.forEach((connection) => {
      if (connection.ws.readyState === 1) {
        // WebSocket.OPEN
        // Check if log matches entity filter
        if (connection.entityId) {
          // For logs, we can't easily determine parent-child relationships
          // So we'll be more permissive and include logs that might be related
          // This is acceptable since logs are less frequent than spans
          const logEntityId = logRecord.attributes?.["entity.id"];
          const logEntityType = logRecord.attributes?.["entity.type"];

          // If no entity.id in log, include it (might be from a child span)
          if (logEntityId && logEntityId !== connection.entityId) {
            // Only filter out if we have an entity.id and it doesn't match
            return; // Skip this connection
          }

          // Additionally filter by type if specified
          if (connection.entityType && logEntityType && logEntityType !== connection.entityType) {
            return; // Skip if type doesn't match
          }
        }
        connection.ws.send(message);
      }
    });
  });

  observabilityListenersInitialized = true;
}

/**
 * Handle new WebSocket connection for observability
 */
export function handleObservabilityConnection(
  ws: IWebSocket,
  request: any,
  _deps: ServerProviderDeps,
): void {
  // Parse entity filters from URL query parameters
  let entityId: string | undefined;
  let entityType: "agent" | "workflow" | undefined;

  try {
    // Extract query parameters from request URL
    const url = new URL(request.url || "", `http://${request.headers?.host || "localhost"}`);
    entityId = url.searchParams.get("entityId") || url.searchParams.get("agentId") || undefined; // Support both for backward compat
    const typeParam = url.searchParams.get("entityType");
    if (typeParam === "agent" || typeParam === "workflow") {
      entityType = typeParam;
    }
  } catch (error) {
    // If URL parsing fails, continue without filter
    console.warn("Failed to parse WebSocket URL for entity filters:", error);
  }

  // Add to connections with filter criteria
  observabilityConnections.set(ws, {
    ws,
    entityId,
    entityType,
  });

  // Send initial connection success message with filter info
  ws.send(
    safeStringify({
      type: "CONNECTION_SUCCESS",
      success: true,
      data: {
        message: entityId
          ? `Connected to observability stream (filtered by ${entityType || "entity"}: ${entityId})`
          : "Connected to observability stream",
        entityId,
        entityType,
        timestamp: Date.now(),
      },
    }),
  );

  // Setup message handler
  ws.on("message", (data: any) => {
    try {
      const msg = JSON.parse(data.toString());

      // Handle different message types
      switch (msg.type) {
        case "PING":
          ws.send(safeStringify({ type: "PONG", success: true }));
          break;
        case "SUBSCRIBE":
          // Could implement trace/span filtering here
          ws.send(
            safeStringify({
              type: "SUBSCRIPTION_SUCCESS",
              success: true,
              data: { subscribed: true },
            }),
          );
          break;
      }
    } catch (_) {
      ws.send(
        safeStringify({
          type: "ERROR",
          success: false,
          error: "Invalid message format",
        }),
      );
    }
  });

  // Handle close
  ws.on("close", () => {
    observabilityConnections.delete(ws);
  });

  // Handle errors
  ws.on("error", () => {
    // Error logged internally by WebSocket implementation
    observabilityConnections.delete(ws);
  });

  // Ensure listeners are setup
  setupObservabilityListeners();
}

/**
 * Close all observability WebSocket connections
 */
export function closeAllObservabilityConnections(): void {
  observabilityConnections.forEach((connection) => {
    if (connection.ws.readyState === 1) {
      connection.ws.close();
    }
  });
  observabilityConnections.clear();

  // Unsubscribe from log events
  if (logUnsubscribe) {
    logUnsubscribe();
    logUnsubscribe = null;
  }

  // Reset initialization flag
  observabilityListenersInitialized = false;
}

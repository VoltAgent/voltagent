import type { Server as HttpServer } from "node:http";
import type { IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import type { INestApplication } from "@nestjs/common";
import { createWebSocketServer } from "@voltagent/server-core";
import type { WebSocketServer } from "ws";
import type { VoltAgentService } from "./voltagent.service";

/**
 * Setup WebSocket support for VoltAgent console in NestJS
 * Handles upgrade events and routes WebSocket connections to VoltAgent handlers
 *
 * @param app - NestJS application instance
 * @param voltAgentService - VoltAgent service containing agents and dependencies
 * @param pathPrefix - Path prefix for VoltAgent WebSocket endpoints (default: '/voltagent/ws')
 * @returns WebSocket server instance
 */
export function setupVoltAgentWebSocket(
  app: INestApplication,
  voltAgentService: VoltAgentService,
  pathPrefix = "/voltagent/ws",
): WebSocketServer {
  // Get underlying HTTP server from NestJS
  const httpServer = app.getHttpServer() as HttpServer;

  // Get VoltAgent dependencies and logger
  const logger = voltAgentService.getLogger();
  const deps = voltAgentService.getDeps();

  // Create WebSocket server using VoltAgent's server-core utilities
  // This provides all the standard VoltAgent WebSocket functionality
  const wss = createWebSocketServer(deps, logger);

  // Handle HTTP upgrade events for WebSocket connections
  httpServer.on("upgrade", (req: IncomingMessage, socket: Socket, head: Buffer) => {
    try {
      const url = new URL(req.url || "", "ws://localhost");
      const requestPath = url.pathname;

      // Check if this is a VoltAgent WebSocket request
      if (requestPath.startsWith(pathPrefix)) {
        // Strip the VoltAgent prefix for internal routing
        // This allows VoltAgent's handlers to work with their expected paths
        // e.g., /voltagent/ws/logs -> /ws/logs
        const internalPath = requestPath.replace("/voltagent", "");
        req.url = internalPath + url.search;

        // Handle the WebSocket upgrade
        wss.handleUpgrade(req, socket, head, (websocket) => {
          wss.emit("connection", websocket, req);
        });
      } else {
        // Not a VoltAgent WebSocket - let other handlers deal with it
        // or destroy the socket if no other handlers exist
        // Note: Don't destroy here to allow other WebSocket handlers in the app
      }
    } catch (error) {
      logger.error("[VoltAgent WebSocket] Upgrade error:", { error });
      socket.destroy();
    }
  });

  logger.info(`[VoltAgent WebSocket] Initialized at ${pathPrefix}`);

  return wss;
}

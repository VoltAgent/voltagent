/**
 * WebSocket setup utilities
 * Framework-agnostic WebSocket server configuration
 */

import type { IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import type { ServerProviderDeps } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import { WebSocketServer } from "ws";
import { handleWebSocketConnection } from "./handlers";

/**
 * Create and configure a WebSocket server
 * @param deps Server provider dependencies
 * @param logger Logger instance
 * @returns Configured WebSocket server
 */
export function createWebSocketServer(deps: ServerProviderDeps, logger: Logger): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket connections
  wss.on("connection", async (ws, req) => {
    await handleWebSocketConnection(ws, req, deps, logger);
  });

  return wss;
}

/**
 * Setup WebSocket upgrade handler for HTTP server
 * @param server HTTP server instance
 * @param wss WebSocket server instance
 * @param pathPrefix Path prefix for WebSocket connections (default: "/ws")
 */
export function setupWebSocketUpgrade(server: any, wss: WebSocketServer, pathPrefix = "/ws"): void {
  server.addListener("upgrade", (req: IncomingMessage, socket: Socket, head: Buffer) => {
    const url = new URL(req.url || "", "http://localhost");
    const path = url.pathname;

    if (path.startsWith(pathPrefix)) {
      wss.handleUpgrade(req, socket, head, (websocket) => {
        wss.emit("connection", websocket, req);
      });
    } else {
      socket.destroy();
    }
  });
}

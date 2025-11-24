/**
 * WebSocket setup utilities
 * Framework-agnostic WebSocket server configuration
 */

import type { IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import type { ServerProviderDeps } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import { WebSocketServer } from "ws";
import type { AuthProvider } from "../auth/types";
import { handleWebSocketConnection } from "./handlers";

/**
 * Helper to check dev request for WebSocket IncomingMessage
 */
function isDevWebSocketRequest(req: IncomingMessage): boolean {
  const hasDevHeader = req.headers["x-voltagent-dev"] === "true";
  const isDevEnv = process.env.NODE_ENV !== "production";
  return hasDevHeader && isDevEnv;
}

/**
 * Helper to check console access for WebSocket IncomingMessage
 */
function hasWebSocketConsoleAccess(req: IncomingMessage): boolean {
  // Parse URL to get query parameters
  const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);

  // 1. Development bypass - check both header and query param
  if (isDevWebSocketRequest(req)) {
    return true;
  }

  // Also check query param for dev bypass (for browser WebSocket)
  const devParam = url.searchParams.get("dev");
  if (devParam === "true" && process.env.NODE_ENV !== "production") {
    return true;
  }

  // 2. Console Access Key check - check both header and query param
  const configuredKey = process.env.VOLTAGENT_CONSOLE_ACCESS_KEY;
  if (configuredKey) {
    // Check header (for non-browser clients)
    const headerKey = req.headers["x-console-access-key"] as string;
    if (headerKey === configuredKey) {
      return true;
    }

    // Check query param (for browser WebSocket)
    const queryKey = url.searchParams.get("key");
    if (queryKey === configuredKey) {
      return true;
    }
  }

  return false;
}

/**
 * Create and configure a WebSocket server
 * @param deps Server provider dependencies
 * @param logger Logger instance
 * @param auth Optional authentication provider
 * @returns Configured WebSocket server
 */
export function createWebSocketServer(
  deps: ServerProviderDeps,
  logger: Logger,
  _auth?: AuthProvider<any>,
): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket connections with auth context
  wss.on("connection", async (ws: any, req: IncomingMessage, user?: any) => {
    await handleWebSocketConnection(ws, req, deps, logger, user);
  });

  return wss;
}

/**
 * Setup WebSocket upgrade handler for HTTP server
 * @param server HTTP server instance
 * @param wss WebSocket server instance
 * @param pathPrefix Path prefix for WebSocket connections (default: "/ws")
 * @param auth Optional authentication provider
 * @param logger Logger instance
 */
export function setupWebSocketUpgrade(
  server: any,
  wss: WebSocketServer,
  pathPrefix = "/ws",
  auth?: AuthProvider<any>,
  logger?: Logger,
): void {
  server.addListener("upgrade", async (req: IncomingMessage, socket: Socket, head: Buffer) => {
    const url = new URL(req.url || "", "http://localhost");
    const path = url.pathname;

    if (path.startsWith(pathPrefix)) {
      let user: any = null;

      // Check authentication if auth provider is configured
      if (auth) {
        try {
          // Check if it's an observability WebSocket that needs Console access
          if (path.includes("/observability")) {
            // Check Console Access or dev bypass using WebSocket-specific helpers
            const hasAccess = hasWebSocketConsoleAccess(req);
            if (!hasAccess) {
              logger?.debug("[WebSocket] Unauthorized observability connection attempt");
              socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
              socket.destroy();
              return;
            }
            // Set a pseudo user for console access
            user = { id: "console", type: "console-access" };
          } else {
            // For other WebSocket paths, try to authenticate with JWT
            // Extract token from query params (common for WebSocket auth)
            const token = url.searchParams.get("token");
            if (token) {
              try {
                user = await auth.verifyToken(token);
              } catch (error) {
                logger?.debug("[WebSocket] Token verification failed:", { error });
                // For non-observability paths, reject if auth fails
                socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                socket.destroy();
                return;
              }
            } else if (auth.defaultPrivate) {
              // If auth is required by default and no token provided
              logger?.debug("[WebSocket] No token provided for protected WebSocket");
              socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
              socket.destroy();
              return;
            }
          }
        } catch (error) {
          logger?.error("[WebSocket] Auth error:", { error });
          socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
          socket.destroy();
          return;
        }
      }

      // Proceed with WebSocket upgrade
      wss.handleUpgrade(req, socket, head, (websocket) => {
        wss.emit("connection", websocket, req, user);
      });
    } else {
      socket.destroy();
    }
  });
}

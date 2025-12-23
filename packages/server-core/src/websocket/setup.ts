/**
 * WebSocket setup utilities
 * Framework-agnostic WebSocket server configuration
 */

import type { IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import type { ServerProviderDeps } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import { WebSocketServer } from "ws";
import { requiresAuth } from "../auth/defaults";
import type { AuthNextConfig } from "../auth/next";
import { isAuthNextConfig, normalizeAuthNextConfig, resolveAuthNextAccess } from "../auth/next";
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

function isWebSocketDevBypass(req: IncomingMessage, url: URL): boolean {
  if (isDevWebSocketRequest(req)) {
    return true;
  }

  const devParam = url.searchParams.get("dev");
  return devParam === "true" && process.env.NODE_ENV !== "production";
}

/**
 * Helper to check console access for WebSocket IncomingMessage
 */
function hasWebSocketConsoleAccess(req: IncomingMessage, url: URL): boolean {
  if (isWebSocketDevBypass(req, url)) {
    return true;
  }

  const configuredKey = process.env.VOLTAGENT_CONSOLE_ACCESS_KEY;
  if (configuredKey) {
    const headerKey = req.headers["x-console-access-key"] as string;
    if (headerKey === configuredKey) {
      return true;
    }

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
 * @param auth Optional authentication provider or authNext config
 * @returns Configured WebSocket server
 */
export function createWebSocketServer(
  deps: ServerProviderDeps,
  logger: Logger,
  _auth?: AuthProvider<any> | AuthNextConfig<any>,
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
 * @param auth Optional authentication provider or authNext config
 * @param logger Logger instance
 */
export function setupWebSocketUpgrade(
  server: any,
  wss: WebSocketServer,
  pathPrefix = "/ws",
  auth?: AuthProvider<any> | AuthNextConfig<any>,
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
          if (isAuthNextConfig(auth)) {
            const config = normalizeAuthNextConfig(auth);
            const provider = config.provider;
            const access = resolveAuthNextAccess("WS", path, config);

            if (access === "public") {
              const token = url.searchParams.get("token");
              if (token) {
                try {
                  user = await provider.verifyToken(token);
                } catch {
                  // Ignore token errors on public routes
                }
              }
            } else if (access === "console") {
              const hasAccess = hasWebSocketConsoleAccess(req, url);
              if (!hasAccess) {
                logger?.debug("[WebSocket] Unauthorized console connection attempt");
                socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                socket.destroy();
                return;
              }
              user = { id: "console", type: "console-access" };
            } else {
              if (isWebSocketDevBypass(req, url)) {
                // Dev bypass for local testing
              } else {
                const token = url.searchParams.get("token");
                if (token) {
                  try {
                    user = await provider.verifyToken(token);
                  } catch (error) {
                    logger?.debug("[WebSocket] Token verification failed:", { error });
                    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                    socket.destroy();
                    return;
                  }
                } else {
                  logger?.debug("[WebSocket] No token provided for protected WebSocket");
                  socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                  socket.destroy();
                  return;
                }
              }
            }
          } else {
            // Legacy auth flow
            if (path.includes("/observability")) {
              const hasAccess = hasWebSocketConsoleAccess(req, url);
              if (!hasAccess) {
                logger?.debug("[WebSocket] Unauthorized observability connection attempt");
                socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                socket.destroy();
                return;
              }
              user = { id: "console", type: "console-access" };
            } else {
              const hasConsoleAccess = hasWebSocketConsoleAccess(req, url);
              if (hasConsoleAccess) {
                user = { id: "console", type: "console-access" };
              } else {
                const needsAuth = requiresAuth("WS", path, auth.publicRoutes, auth.defaultPrivate);

                if (needsAuth) {
                  const token = url.searchParams.get("token");
                  if (token) {
                    try {
                      user = await auth.verifyToken(token);
                    } catch (error) {
                      logger?.debug("[WebSocket] Token verification failed:", { error });
                      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                      socket.destroy();
                      return;
                    }
                  } else {
                    logger?.debug("[WebSocket] No token provided for protected WebSocket");
                    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                    socket.destroy();
                    return;
                  }
                } else {
                  const token = url.searchParams.get("token");
                  if (token) {
                    try {
                      user = await auth.verifyToken(token);
                    } catch {
                      // Ignore token errors on public routes
                    }
                  }
                }
              }
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

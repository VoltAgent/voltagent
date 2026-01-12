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

type WebSocketAuthResult = {
  user: any | null;
  handled: boolean;
};

function closeUpgrade(socket: Socket, statusLine: string): void {
  socket.end(`${statusLine}\r\n\r\n`);
}

function denyUnauthorized(socket: Socket): WebSocketAuthResult {
  closeUpgrade(socket, "HTTP/1.1 401 Unauthorized");
  return { user: null, handled: true };
}

function denyServerError(socket: Socket): WebSocketAuthResult {
  closeUpgrade(socket, "HTTP/1.1 500 Internal Server Error");
  return { user: null, handled: true };
}

async function verifyTokenIfPresent(
  provider: AuthProvider<any>,
  token: string | null,
): Promise<any | null> {
  if (!token) {
    return null;
  }
  try {
    return await provider.verifyToken(token);
  } catch {
    return null;
  }
}

async function verifyTokenOrReject(params: {
  provider: AuthProvider<any>;
  token: string | null;
  socket: Socket;
  logger?: Logger;
  missingTokenLog: string;
}): Promise<WebSocketAuthResult> {
  const { provider, token, socket, logger, missingTokenLog } = params;

  if (!token) {
    logger?.debug(missingTokenLog);
    return denyUnauthorized(socket);
  }

  try {
    const user = await provider.verifyToken(token);
    return { user, handled: false };
  } catch (error) {
    logger?.debug("[WebSocket] Token verification failed:", { error });
    return denyUnauthorized(socket);
  }
}

async function resolveAuthNextUser(params: {
  auth: AuthNextConfig<any> | AuthProvider<any>;
  path: string;
  req: IncomingMessage;
  url: URL;
  socket: Socket;
  logger?: Logger;
}): Promise<WebSocketAuthResult> {
  const { auth, path, req, url, socket, logger } = params;
  const config = normalizeAuthNextConfig(auth);
  const provider = config.provider;
  const access = resolveAuthNextAccess("WS", path, config);

  if (access === "public") {
    const user = await verifyTokenIfPresent(provider, url.searchParams.get("token"));
    return { user, handled: false };
  }

  if (access === "console") {
    const hasAccess = hasWebSocketConsoleAccess(req, url);
    if (!hasAccess) {
      logger?.debug("[WebSocket] Unauthorized console connection attempt");
      return denyUnauthorized(socket);
    }
    return { user: { id: "console", type: "console-access" }, handled: false };
  }

  if (isWebSocketDevBypass(req, url)) {
    // Dev bypass for local testing
    return { user: null, handled: false };
  }

  return verifyTokenOrReject({
    provider,
    token: url.searchParams.get("token"),
    socket,
    logger,
    missingTokenLog: "[WebSocket] No token provided for protected WebSocket",
  });
}

async function resolveLegacyAuthUser(params: {
  auth: AuthProvider<any>;
  path: string;
  req: IncomingMessage;
  url: URL;
  socket: Socket;
  logger?: Logger;
}): Promise<WebSocketAuthResult> {
  const { auth, path, req, url, socket, logger } = params;

  if (path.includes("/observability")) {
    const hasAccess = hasWebSocketConsoleAccess(req, url);
    if (!hasAccess) {
      logger?.debug("[WebSocket] Unauthorized observability connection attempt");
      return denyUnauthorized(socket);
    }
    return { user: { id: "console", type: "console-access" }, handled: false };
  }

  const hasConsoleAccess = hasWebSocketConsoleAccess(req, url);
  if (hasConsoleAccess) {
    return { user: { id: "console", type: "console-access" }, handled: false };
  }

  const needsAuth = requiresAuth("WS", path, auth.publicRoutes, auth.defaultPrivate);
  if (needsAuth) {
    return verifyTokenOrReject({
      provider: auth,
      token: url.searchParams.get("token"),
      socket,
      logger,
      missingTokenLog: "[WebSocket] No token provided for protected WebSocket",
    });
  }

  const user = await verifyTokenIfPresent(auth, url.searchParams.get("token"));
  return { user, handled: false };
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

    if (!path.startsWith(pathPrefix)) {
      socket.destroy();
      return;
    }

    let user: any = null;

    // Check authentication if auth provider is configured
    if (auth) {
      try {
        const authResult = isAuthNextConfig(auth)
          ? await resolveAuthNextUser({ auth, path, req, url, socket, logger })
          : await resolveLegacyAuthUser({ auth, path, req, url, socket, logger });

        if (authResult.handled) {
          return;
        }
        user = authResult.user;
      } catch (error) {
        logger?.error("[WebSocket] Auth error:", { error });
        denyServerError(socket);
        return;
      }
    }

    // Proceed with WebSocket upgrade
    wss.handleUpgrade(req, socket, head, (websocket) => {
      wss.emit("connection", websocket, req, user);
    });
  });
}

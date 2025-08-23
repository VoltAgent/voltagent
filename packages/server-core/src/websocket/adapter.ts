/**
 * WebSocket adapter interface
 * Framework-agnostic WebSocket abstraction
 */

import type { IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import type { IWebSocket } from "../types/websocket";

/**
 * WebSocket server adapter interface
 * Each framework (Hono, Fastify, Express) implements this interface
 */
export interface WebSocketAdapter {
  /**
   * Handle HTTP upgrade request to WebSocket
   * @param request The HTTP upgrade request
   * @param socket The underlying TCP socket
   * @param head The first packet of the upgraded stream
   */
  handleUpgrade(request: IncomingMessage, socket: Socket, head: Buffer): void;

  /**
   * Register a connection handler
   * @param handler Function to handle new WebSocket connections
   */
  onConnection(handler: WebSocketConnectionHandler): void;

  /**
   * Close all WebSocket connections
   */
  closeAll(): void;

  /**
   * Get the number of active connections
   */
  getConnectionCount(): number;
}

/**
 * WebSocket connection handler type
 */
export type WebSocketConnectionHandler = (
  ws: IWebSocket,
  req: IncomingMessage,
) => void | Promise<void>;

/**
 * WebSocket path router
 * Routes WebSocket connections to different handlers based on path
 */
export class WebSocketRouter {
  private routes = new Map<string | RegExp, WebSocketConnectionHandler>();
  private defaultHandler?: WebSocketConnectionHandler;

  /**
   * Add a route handler
   * @param path Path pattern (string or regex)
   * @param handler Connection handler for this path
   */
  route(path: string | RegExp, handler: WebSocketConnectionHandler): this {
    this.routes.set(path, handler);
    return this;
  }

  /**
   * Set default handler for unmatched paths
   * @param handler Default connection handler
   */
  default(handler: WebSocketConnectionHandler): this {
    this.defaultHandler = handler;
    return this;
  }

  /**
   * Get handler for a given path
   * @param path The request path
   * @returns The matching handler or default handler
   */
  getHandler(path: string): WebSocketConnectionHandler | undefined {
    // Check exact string matches first
    if (this.routes.has(path)) {
      return this.routes.get(path);
    }

    // Check regex patterns
    for (const [pattern, handler] of this.routes) {
      if (pattern instanceof RegExp && pattern.test(path)) {
        return handler;
      }
    }

    return this.defaultHandler;
  }

  /**
   * Handle a WebSocket connection
   * @param ws WebSocket connection
   * @param req HTTP request
   */
  async handle(ws: IWebSocket, req: IncomingMessage): Promise<void> {
    const url = new URL(req.url || "", "ws://localhost");
    const handler = this.getHandler(url.pathname);

    if (handler) {
      await handler(ws, req);
    } else {
      // No handler found, close connection
      ws.close();
    }
  }
}

/**
 * Create a WebSocket router
 * @returns New WebSocket router instance
 */
export function createWebSocketRouter(): WebSocketRouter {
  return new WebSocketRouter();
}

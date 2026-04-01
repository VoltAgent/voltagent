/**
 * Base server provider class
 * Framework-agnostic server implementation base
 */

import type { Server } from "node:http";
import type { IServerProvider, RegisteredTrigger, ServerProviderDeps } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import type { WebSocketServer } from "ws";
import { buildMcpRoutePaths } from "../mcp/routes";
import { A2A_ROUTES, MCP_ROUTES } from "../routes/definitions";
import type { ServerEndpointSummary } from "../types/server";
import { showAnnouncements } from "../utils/announcements";
import { portManager } from "../utils/port-manager";
import { printServerStartup } from "../utils/server-utils";
import { createWebSocketServer, setupWebSocketUpgrade } from "../websocket/setup";

/**
 * Base configuration for server providers
 * Extends the common BaseServerConfig with additional options
 */
export interface ServerProviderConfig {
  /**
   * Port to listen on (default: 3141)
   */
  port?: number;

  /**
   * Enable Swagger UI (default: true in development)
   */
  enableSwaggerUI?: boolean;

  /**
   * Enable WebSocket support (default: true)
   */
  enableWebSocket?: boolean;

  /**
   * WebSocket path prefix (default: "/ws")
   */
  websocketPath?: string;

  /**
   * Additional configuration specific to the framework
   */
  [key: string]: any;
}

/**
 * Abstract base class for server providers
 * Handles common server lifecycle management
 */
export abstract class BaseServerProvider implements IServerProvider {
  protected deps: ServerProviderDeps;
  protected config: ServerProviderConfig;
  protected logger: Logger;
  protected running = false;
  protected allocatedPort: number | null = null;
  protected server?: Server;
  protected websocketServer?: WebSocketServer;

  constructor(deps: ServerProviderDeps, config: ServerProviderConfig = {}) {
    this.deps = deps;
    this.config = config;
    this.logger = deps.logger?.child({ component: "server" }) || this.createDefaultLogger();
  }

  /**
   * Start the server
   */
  async start(): Promise<{ port: number }> {
    if (this.running) {
      throw new Error("Server is already running");
    }

    // Allocate port from central manager
    const port = await portManager.allocatePort(this.config.port);
    this.allocatedPort = port;

    try {
      // Framework-specific server start
      this.server = await this.startServer(port);

      // Setup WebSocket if enabled
      if (this.config.enableWebSocket !== false) {
        this.websocketServer = createWebSocketServer(this.deps, this.logger);
        setupWebSocketUpgrade(this.server, this.websocketServer, this.config.websocketPath);
      }

      this.running = true;

      // Show announcements (non-blocking)
      showAnnouncements();

      // Print startup message
      const customEndpoints = this.collectFeatureEndpoints();

      printServerStartup(port, {
        enableSwaggerUI: this.config.enableSwaggerUI,
        customEndpoints: customEndpoints.length > 0 ? customEndpoints : undefined,
      });

      return { port };
    } catch (error) {
      // If server fails to start, release the port
      portManager.releasePort(port);
      this.allocatedPort = null;
      throw error;
    }
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    // Close WebSocket server if exists
    if (this.websocketServer) {
      this.websocketServer.close();
    }

    // Framework-specific server stop
    await this.stopServer();

    // Release the allocated port
    if (this.allocatedPort !== null) {
      portManager.releasePort(this.allocatedPort);
      this.allocatedPort = null;
    }

    this.running = false;
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Framework-specific server start implementation
   * @param port The port to listen on
   * @returns The HTTP server instance
   */
  protected abstract startServer(port: number): Promise<Server>;

  /**
   * Framework-specific server stop implementation
   */
  protected abstract stopServer(): Promise<void>;

  /**
   * Create a default logger if none provided
   */
  private createDefaultLogger(): Logger {
    // Simple console logger as fallback
    return {
      trace: (msg: string, context?: object) => console.trace(msg, context),
      debug: (msg: string, context?: object) => console.debug(msg, context),
      info: (msg: string, context?: object) => console.info(msg, context),
      warn: (msg: string, context?: object) => console.warn(msg, context),
      error: (msg: string, context?: object) => console.error(msg, context),
      fatal: (msg: string, context?: object) => console.error("[FATAL]", msg, context),
      child: () => this.createDefaultLogger(),
    };
  }

  /**
   * Handle graceful shutdown
   */
  protected setupGracefulShutdown(): void {
    const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

    signals.forEach((signal) => {
      process.on(signal, async () => {
        this.logger.info(`Received ${signal}, shutting down gracefully...`);
        await this.stop();
        process.exit(0);
      });
    });
  }

  protected collectFeatureEndpoints(): ServerEndpointSummary[] {
    const endpoints: ServerEndpointSummary[] = [];
    const seen = new Set<string>();

    const addRoutes = (
      routes: Record<string, { method: string; path: string; tags?: string[] }>,
      groupLabel: string,
    ) => {
      Object.values(routes).forEach((route) => {
        const key = `${route.method.toUpperCase()} ${route.path}`;
        if (!seen.has(key)) {
          seen.add(key);
          const prettyPath = route.path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
          endpoints.push({
            method: route.method.toUpperCase(),
            path: prettyPath,
            group: groupLabel,
          });
        }
      });
    };

    const mcpRegistry = this.deps.mcp?.registry;
    const registeredMcpServers =
      mcpRegistry && typeof mcpRegistry.listMetadata === "function"
        ? mcpRegistry.listMetadata()
        : [];
    if (registeredMcpServers.length > 0) {
      addRoutes(MCP_ROUTES, "MCP Endpoints");

      registeredMcpServers.forEach((server) => {
        const protocols = server.protocols ?? {};
        const httpEnabled = protocols.http ?? true;
        const sseEnabled = protocols.sse ?? true;
        const stdioEnabled = protocols.stdio ?? true;
        const { httpPath, ssePath, messagePath } = buildMcpRoutePaths(server.id);

        if (httpEnabled) {
          const key = `POST ${httpPath}`;
          if (!seen.has(key)) {
            seen.add(key);
            endpoints.push({
              method: "POST",
              path: httpPath,
              group: "MCP Transport",
            });
          }
        }

        if (stdioEnabled) {
          const stdioPath = `stdio://${server.id}`;
          const stdioKey = `STDIO ${stdioPath}`;
          if (!seen.has(stdioKey)) {
            seen.add(stdioKey);
            endpoints.push({
              method: "STDIO",
              path: stdioPath,
              group: "MCP Transport",
            });
          }
        }

        if (sseEnabled) {
          const sseKey = `GET ${ssePath}`;
          if (!seen.has(sseKey)) {
            seen.add(sseKey);
            endpoints.push({
              method: "GET",
              path: ssePath,
              group: "MCP Transport",
            });
          }

          const messageKey = `POST ${messagePath}`;
          if (!seen.has(messageKey)) {
            seen.add(messageKey);
            endpoints.push({
              method: "POST",
              path: messagePath,
              group: "MCP Transport",
            });
          }
        }
      });
    }

    const a2aRegistry = this.deps.a2a?.registry;
    const registeredA2AServers =
      a2aRegistry && typeof a2aRegistry.list === "function" ? a2aRegistry.list() : [];
    if (registeredA2AServers.length > 0) {
      addRoutes(A2A_ROUTES, "A2A Endpoints");
    }

    const registeredTriggers: RegisteredTrigger[] = this.deps.triggerRegistry?.list?.() ?? [];
    if (registeredTriggers.length > 0) {
      registeredTriggers.forEach((trigger) => {
        endpoints.push({
          method: trigger.method.toUpperCase(),
          path: trigger.path,
          group: "Trigger Endpoints",
          name: trigger.name,
          description: trigger.summary ?? trigger.description ?? trigger.definition?.description,
        });
      });
    }

    return endpoints;
  }
}

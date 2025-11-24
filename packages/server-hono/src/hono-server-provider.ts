/**
 * Hono server provider implementation
 * Extends BaseServerProvider with Hono-specific implementation
 */

import type { Server } from "node:http";
import { serve } from "@hono/node-server";
import type { ServerProviderDeps } from "@voltagent/core";
import {
  A2A_ROUTES,
  BaseServerProvider,
  MCP_ROUTES,
  createWebSocketServer,
  portManager,
  printServerStartup,
  setupWebSocketUpgrade,
} from "@voltagent/server-core";
import { createApp } from "./app-factory";
import type { HonoServerConfig } from "./types";
import { extractCustomEndpoints } from "./utils/custom-endpoints";

/**
 * Hono server provider class
 */
export class HonoServerProvider extends BaseServerProvider {
  private honoConfig: HonoServerConfig;
  private app?: any; // Store app instance to extract custom endpoints

  constructor(deps: ServerProviderDeps, config: HonoServerConfig = {}) {
    super(deps, config);
    this.honoConfig = config;
  }

  /**
   * Start the Hono server
   */
  protected async startServer(port: number): Promise<Server> {
    // Create the app with dependencies and actual port
    const { app } = await createApp(this.deps, this.honoConfig, port);

    // Store app instance for custom endpoint extraction
    this.app = app;

    return new Promise((resolve, reject) => {
      try {
        // The serve function from @hono/node-server automatically starts listening
        // It returns a server that's already bound to the port
        const server = serve({
          fetch: app.fetch.bind(app),
          port,
          hostname: this.honoConfig.hostname || "0.0.0.0",
        });

        // Check if server started successfully
        const errorHandler = (error: Error) => {
          server.removeListener("listening", successHandler);
          reject(error);
        };

        const successHandler = () => {
          server.removeListener("error", errorHandler);
          resolve(server as unknown as Server);
        };

        // Listen for immediate errors (like EADDRINUSE)
        server.once("error", errorHandler);
        server.once("listening", successHandler);

        // Set a timeout to detect if server doesn't start
        setTimeout(() => {
          if (!server.listening) {
            server.removeListener("error", errorHandler);
            server.removeListener("listening", successHandler);
            // If not listening after a short time, resolve anyway
            // The serve() function might handle errors differently
            resolve(server as unknown as Server);
          }
        }, 100);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the Hono server
   */
  protected async stopServer(): Promise<void> {
    if (this.server) {
      this.server.close();
    }
  }

  /**
   * Override start method to include custom endpoints in startup display
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
        this.websocketServer = createWebSocketServer(this.deps, this.logger, this.config.auth);
        setupWebSocketUpgrade(
          this.server,
          this.websocketServer,
          this.config.websocketPath,
          this.config.auth,
          this.logger,
        );
      }

      this.running = true;

      // Collect all endpoints (feature + custom)
      let allEndpoints = this.collectFeatureEndpoints();

      // Get base feature endpoints
      const addRoutes = (
        routes: Record<string, { method: string; path: string; tags?: string[] }>,
        groupLabel: string,
      ) => {
        Object.values(routes).forEach((route) => {
          const prettyPath = route.path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
          allEndpoints.push({
            method: route.method.toUpperCase(),
            path: prettyPath,
            group: groupLabel,
          });
        });
      };

      // Add feature endpoints
      const mcpRegistry = this.deps.mcp?.registry;
      const registeredMcpServers =
        mcpRegistry && typeof mcpRegistry.list === "function" ? mcpRegistry.list() : [];
      if (registeredMcpServers.length > 0) {
        addRoutes(MCP_ROUTES, "MCP Endpoints");
      }

      const a2aRegistry = this.deps.a2a?.registry;
      const registeredA2AServers =
        a2aRegistry && typeof a2aRegistry.list === "function" ? a2aRegistry.list() : [];
      if (registeredA2AServers.length > 0) {
        addRoutes(A2A_ROUTES, "A2A Endpoints");
      }

      // Add custom endpoints if we have them
      if (this.app && this.honoConfig.configureApp) {
        try {
          const customEndpoints = extractCustomEndpoints(this.app);
          allEndpoints = [...allEndpoints, ...customEndpoints];
        } catch (_error) {
          // If extraction fails, continue without custom endpoints
          this.logger.warn("Failed to extract custom endpoints for startup display");
        }
      }

      // Print startup message with all endpoints
      printServerStartup(port, {
        enableSwaggerUI: this.config.enableSwaggerUI,
        customEndpoints: allEndpoints.length > 0 ? allEndpoints : undefined,
      });

      return { port };
    } catch (error) {
      // If server fails to start, release the port
      portManager.releasePort(port);
      this.allocatedPort = null;
      throw error;
    }
  }
}

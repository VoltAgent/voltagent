/**
 * Elysia server provider implementation
 * Extends BaseServerProvider with Elysia-specific implementation
 */

import type { Server } from "node:http";
import type { ServerProviderDeps } from "@voltagent/core";
import {
  BaseServerProvider,
  createWebSocketServer,
  portManager,
  printServerStartup,
  setupWebSocketUpgrade,
  showAnnouncements,
} from "@voltagent/server-core";
import { createApp } from "./app-factory";
import type { ElysiaServerConfig } from "./types";
import { extractCustomEndpoints } from "./utils/custom-endpoints";

/**
 * Elysia server provider class
 */
export class ElysiaServerProvider extends BaseServerProvider {
  private elysiaConfig: ElysiaServerConfig;
  private app?: any; // Store app instance to extract custom endpoints

  constructor(deps: ServerProviderDeps, config: ElysiaServerConfig = {}) {
    super(deps, config);
    this.elysiaConfig = config;
  }

  /**
   * Start the Elysia server
   */
  protected async startServer(port: number): Promise<Server> {
    // Create the app with dependencies and actual port
    const { app } = await createApp(this.deps, this.elysiaConfig, port);

    // Store app instance for custom endpoint extraction
    this.app = app;

    try {
      // Elysia's listen() method returns a server instance (works in Bun)
      const server = app.listen({
        port,
        hostname: this.elysiaConfig.hostname || "0.0.0.0",
      });

      return server as unknown as Server;
    } catch (error: unknown) {
      // Fallback for Node.js environment where WebStandard listen is not supported
      if (
        error instanceof Error &&
        (error.message.includes("WebStandard does not support listen") ||
          error.message.includes("is not a function"))
      ) {
        const { createServer } = await import("node:http");
        const server = createServer(app.fetch);

        return new Promise((resolve, reject) => {
          server.once("error", reject);
          server.listen(port, this.elysiaConfig.hostname || "0.0.0.0", () => {
            resolve(server);
          });
        });
      }
      throw error;
    }
  }

  /**
   * Stop the Elysia server
   */
  protected async stopServer(): Promise<void> {
    try {
      if (this.app?.stop) {
        await this.app.stop();
      }
    } catch (_error) {
      // Ignore errors from app.stop() in Node environment where Elysia might complain
      // "Elysia isn't running"
    }

    // Ensure the underlying Node.js server is closed if it exists
    if (this.server?.listening) {
      await new Promise<void>((resolve, reject) => {
        this.server?.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
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
        const authConfig = this.elysiaConfig.authNext ?? this.elysiaConfig.auth;
        this.websocketServer = createWebSocketServer(this.deps, this.logger, authConfig);
        setupWebSocketUpgrade(
          this.server,
          this.websocketServer,
          this.config.websocketPath,
          authConfig,
          this.logger,
        );
      }

      this.running = true;

      // Show announcements (non-blocking)
      showAnnouncements();

      // Collect all endpoints (feature + custom)
      const allEndpoints = this.collectFeatureEndpoints();

      // Add custom endpoints if we have them
      if (this.app && this.elysiaConfig.configureApp) {
        try {
          const customEndpoints = extractCustomEndpoints(this.app);
          const seen = new Set(
            allEndpoints.map((endpoint) => `${endpoint.method} ${endpoint.path}`),
          );
          customEndpoints.forEach((endpoint) => {
            const key = `${endpoint.method} ${endpoint.path}`;
            if (!seen.has(key)) {
              seen.add(key);
              allEndpoints.push(endpoint);
            }
          });
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

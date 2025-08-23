/**
 * Base server provider class
 * Framework-agnostic server implementation base
 */

import type { Server } from "node:http";
import type { IServerProvider, ServerProviderDeps } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import type { WebSocketServer } from "ws";
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

      // Print startup message
      printServerStartup(port, {
        enableSwaggerUI: this.config.enableSwaggerUI,
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
}

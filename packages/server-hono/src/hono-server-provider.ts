/**
 * Hono server provider implementation
 * Extends BaseServerProvider with Hono-specific implementation
 */

import type { Server } from "node:http";
import { serve } from "@hono/node-server";
import type { ServerProviderDeps } from "@voltagent/core";
import { BaseServerProvider } from "@voltagent/server-core";
import { createApp } from "./app-factory";
import type { HonoServerConfig } from "./types";

/**
 * Hono server provider class
 */
export class HonoServerProvider extends BaseServerProvider {
  private honoConfig: HonoServerConfig;

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
}

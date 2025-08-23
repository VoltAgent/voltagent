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

    // Create and start the server
    const server = serve({
      fetch: app.fetch.bind(app),
      port,
      hostname: "0.0.0.0",
    });

    // The serve function returns the node http.Server
    return server as unknown as Server;
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

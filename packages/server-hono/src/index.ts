import type { IServerProvider, ServerProviderDeps } from "@voltagent/core";
import { HonoServerProvider } from "./hono-server-provider";
import type { HonoServerConfig } from "./types";

/**
 * Creates a Hono server provider
 */
export function honoServer(config: HonoServerConfig = {}) {
  return (deps: ServerProviderDeps): IServerProvider => {
    return new HonoServerProvider(deps, config);
  };
}

// Export the factory function as default as well
export default honoServer;

// Re-export types that might be needed
export type { HonoServerConfig } from "./types";

// Export auth utilities
export { jwtAuth } from "./auth";

// Export custom endpoint utilities
export { extractCustomEndpoints, getEnhancedOpenApiDoc } from "./utils/custom-endpoints";

// Export app factory for middleware integrations (e.g., NestJS, Express)
export { createApp as createVoltAgentApp } from "./app-factory";

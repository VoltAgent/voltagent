import type { IServerProvider, ServerProviderDeps } from "@voltagent/core";
import { ElysiaServerProvider } from "./elysia-server-provider";
import type { ElysiaServerConfig } from "./types";

/**
 * Creates an Elysia server provider
 */
export function elysiaServer(config: ElysiaServerConfig = {}) {
  return (deps: ServerProviderDeps): IServerProvider => {
    return new ElysiaServerProvider(deps, config);
  };
}

// Export the factory function as default as well
export default elysiaServer;

// Re-export types that might be needed
export type { ElysiaServerConfig } from "./types";

// Export auth utilities
export { DEFAULT_CONSOLE_ROUTES, jwtAuth, type AuthNextConfig } from "./auth";

// Export custom endpoint utilities
export { extractCustomEndpoints, getEnhancedOpenApiDoc } from "./utils/custom-endpoints";

// Export app factory for middleware integrations
export { createApp as createVoltAgentApp } from "./app-factory";

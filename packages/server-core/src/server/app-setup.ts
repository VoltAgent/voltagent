/**
 * Common app setup utilities
 * Framework-agnostic application configuration helpers
 */

import type { ServerProviderDeps } from "@voltagent/core/edge";
import { getGlobalLogger } from "@voltagent/core/edge";
import type { Logger } from "@voltagent/internal";

/**
 * OpenAPI documentation info
 */
export interface OpenApiInfo {
  version?: string;
  title?: string;
  description?: string;
}

/**
 * Common app setup configuration
 */
export interface AppSetupConfig {
  /**
   * Enable Swagger UI
   */
  enableSwaggerUI?: boolean;

  /**
   * CORS options
   */
  corsOptions?: any;

  /**
   * OpenAPI documentation info
   */
  openApiInfo?: OpenApiInfo;

  /**
   * Server port for documentation
   */
  port?: number;
}

/**
 * Get or create a logger instance
 * @param deps Server provider dependencies
 * @param component Component name for logger
 * @returns Logger instance
 */
export function getOrCreateLogger(deps: ServerProviderDeps, component = "api-server"): Logger {
  return deps.logger?.child({ component }) ?? getGlobalLogger().child({ component });
}

/**
 * Check if Swagger UI should be enabled
 * @param config App configuration
 * @returns Whether Swagger UI should be enabled
 */
export function shouldEnableSwaggerUI(config: { enableSwaggerUI?: boolean }): boolean {
  const isProduction = process.env.NODE_ENV === "production";
  return config.enableSwaggerUI ?? !isProduction;
}

/**
 * Get default OpenAPI documentation info
 * @param port Server port
 * @returns OpenAPI documentation object
 */
export function getOpenApiDoc(port: number, info?: OpenApiInfo) {
  return {
    openapi: "3.1.0" as const,
    info: {
      version: info?.version || "1.0.0",
      title: info?.title || "VoltAgent Core API",
      description: info?.description || "API for managing and interacting with VoltAgents",
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: "Local development server",
      },
    ],
  };
}

/**
 * Default CORS configuration
 */
export const DEFAULT_CORS_OPTIONS = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

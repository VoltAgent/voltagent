/**
 * Server-related type definitions
 */

/**
 * Port configuration with associated messages
 */
export interface PortConfig {
  port: number;
  messages: string[];
}

/**
 * Options for server startup display
 */
export interface ServerStartupOptions {
  enableSwaggerUI?: boolean;
  customEndpoints?: Array<{
    path: string;
    method: string;
    description?: string;
  }>;
}

/**
 * Common server configuration that all implementations should support
 */
export interface BaseServerConfig {
  port?: number;
  enableSwaggerUI?: boolean;
  hostname?: string;
}

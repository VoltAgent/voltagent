import type { AuthProvider } from "@voltagent/server-core";
import type { OpenAPIHonoType } from "./zod-openapi-compat";

export interface HonoServerConfig {
  port?: number;
  enableSwaggerUI?: boolean;

  /**
   * Hostname to bind the server to
   * @default "0.0.0.0" - Binds to all IPv4 interfaces
   * @example
   * ```typescript
   * // Bind to all IPv4 interfaces (default)
   * hostname: "0.0.0.0"
   *
   * // Bind to IPv6 and IPv4 (dual-stack)
   * hostname: "::"
   *
   * // Bind to localhost only
   * hostname: "127.0.0.1"
   * ```
   */
  hostname?: string;

  /**
   * Configure the Hono app with custom routes, middleware, and plugins.
   * This gives you full access to the Hono app instance to register
   * routes and middleware using Hono's native API.
   *
   * @example
   * ```typescript
   * configureApp: (app) => {
   *   // Add custom routes
   *   app.get('/health', (c) => c.json({ status: 'ok' }));
   *
   *   // Add middleware
   *   app.use('/admin/*', authMiddleware);
   *
   *   // Use route groups
   *   const api = app.basePath('/api/v2');
   *   api.get('/users', getUsersHandler);
   * }
   * ```
   */
  configureApp?: (app: OpenAPIHonoType) => void | Promise<void>;

  /**
   * Authentication provider for protecting agent/workflow execution endpoints
   * When provided, execution endpoints will require valid authentication
   */
  auth?: AuthProvider;
}

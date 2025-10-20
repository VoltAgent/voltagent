import type { AuthProvider } from "@voltagent/server-core";
import type { OpenAPIHonoType } from "./zod-openapi-compat";

export interface HonoServerConfig {
  port?: number;

  /**
   * Hostname to bind the server to
   * - "0.0.0.0" - Binds to all IPv4 interfaces (default)
   * - "::" - Binds to all IPv6 interfaces (dual-stack on most systems)
   * - "localhost" or "127.0.0.1" - Only localhost access
   *
   * @default "0.0.0.0"
   */
  hostname?: string;

  enableSwaggerUI?: boolean;

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

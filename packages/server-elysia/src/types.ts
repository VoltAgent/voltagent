import type { ResumableStreamAdapter } from "@voltagent/core";
import type { AuthNextConfig, AuthProvider } from "@voltagent/server-core";
import type { Elysia } from "elysia";

type CORSOptions = {
  origin?: string | string[] | ((origin: string) => string | undefined | null);
  allowMethods?: string[];
  allowHeaders?: string[];
  maxAge?: number;
  credentials?: boolean;
  exposeHeaders?: string[];
};

export interface ElysiaServerConfig {
  port?: number;

  resumableStream?: {
    adapter: ResumableStreamAdapter;
    defaultEnabled?: boolean;
  };

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
   * CORS configuration options
   *
   * Set to `false` to disable default CORS middleware and configure route-specific CORS in configureApp
   *
   * @default Allows all origins (*)
   * @example
   * ```typescript
   * // Global CORS (default approach)
   * cors: {
   *   origin: "http://example.com",
   *   allowHeaders: ["X-Custom-Header", "Content-Type"],
   *   allowMethods: ["POST", "GET", "OPTIONS"],
   *   maxAge: 600,
   *   credentials: true,
   * }
   *
   * // Disable default CORS for route-specific control
   * cors: false,
   * configureApp: (app) => {
   *   app.use(cors({ origin: "https://agents.com" }));
   * }
   * ```
   */
  cors?: CORSOptions | false;

  /**
   * Configure the Elysia app with custom routes, middleware, and plugins.
   * This gives you full access to the Elysia app instance to register
   * routes and middleware using Elysia's native API.
   *
   * NOTE: Custom routes added via configureApp are protected by the auth middleware
   * if one is configured (auth/authNext). Routes are registered AFTER authentication middleware.
   *
   * @example
   * ```typescript
   * configureApp: (app) => {
   *   // Add custom routes (will be auth-protected if auth/authNext is set)
   *   app.get('/health', () => ({ status: 'ok' }));
   *
   *   // Add middleware
   *   app.use(customPlugin);
   *
   *   // Use route groups
   *   app.group('/api/v2', (app) =>
   *     app.get('/users', getUsersHandler)
   *   );
   * }
   * ```
   */
  configureApp?: (app: Elysia) => void | Promise<void>;

  /**
   * Full app configuration that provides access to app, routes, and middlewares.
   * When this is set, configureApp will not be executed.
   * This allows you to control the exact order of route and middleware registration.
   *
   * @example
   * ```typescript
   * configureFullApp: ({ app, routes, middlewares }) => {
   *   // Apply middleware first
   *   middlewares.cors();
   *   middlewares.auth();
   *
   *   // Register routes in custom order
   *   routes.agents();
   *
   *   // Add custom routes
   *   app.get('/custom', () => ({ custom: true }));
   *
   *   // Register remaining routes
   *   routes.workflows();
   *   routes.doc();
   * }
   * ```
   */
  configureFullApp?: (options: {
    app: Elysia;
    routes: Record<string, () => void>;
    middlewares: Record<string, () => void>;
  }) => void | Promise<void>;

  /**
   * @deprecated Use `authNext` instead for better security and flexibility.
   * Legacy authentication provider configuration.
   */
  auth?: AuthProvider;

  /**
   * Authentication configuration with support for public routes and console access.
   * All routes are protected by default unless specified in publicRoutes.
   *
   * @example
   * ```typescript
   * authNext: {
   *   provider: jwtAuth({ secret: process.env.JWT_SECRET! }),
   *   publicRoutes: ["GET /health", "POST /webhooks/*"],
   * }
   * ```
   */
  authNext?: AuthNextConfig;

  /**
   * Enable WebSocket support (default: true)
   */
  enableWebSocket?: boolean;

  /**
   * WebSocket path prefix (default: "/ws")
   */
  websocketPath?: string;
}

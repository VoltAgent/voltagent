import type { AuthProvider } from "@voltagent/server-core";
import type { Context } from "hono";
import type { OpenAPIHonoType } from "./zod-openapi-compat";

type CORSOptions = {
  origin?: string | string[] | ((origin: string, c: Context) => string | undefined | null);
  allowMethods?: string[] | ((origin: string, c: Context) => string[]);
  allowHeaders?: string[];
  maxAge?: number;
  credentials?: boolean;
  exposeHeaders?: string[];
};

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
   *   app.use("/agents/*", cors({ origin: "https://agents.com" }));
   *   app.use("/api/public/*", cors({ origin: "*" }));
   * }
   * ```
   */
  cors?: CORSOptions | false;

  /**
   * Configure the Hono app with custom routes, middleware, and plugins.
   * This gives you full access to the Hono app instance to register
   * routes and middleware using Hono's native API.
   *
   * NOTE: Custom routes added via configureApp are protected by the auth middleware
   * if one is configured. Routes are registered AFTER authentication middleware.
   *
   * @example
   * ```typescript
   * configureApp: (app) => {
   *   // Add custom routes (will be auth-protected if config.auth is set)
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
   *   routes.custom();
   *   routes.workflows();
   * }
   * ```
   */
  configureFullApp?: (params: {
    app: OpenAPIHonoType;
    routes: {
      agents: () => void;
      workflows: () => void;
      logs: () => void;
      updates: () => void;
      observability: () => void;
      triggers: () => void;
      mcp: () => void;
      a2a: () => void;
      doc: () => void;
      ui: () => void;
    };
    middlewares: {
      cors: () => void;
      auth: () => void;
      landingPage: () => void;
    };
  }) => void | Promise<void>;

  /**
   * Authentication provider for protecting agent/workflow execution endpoints
   * When provided, execution endpoints will require valid authentication
   */
  auth?: AuthProvider;
}

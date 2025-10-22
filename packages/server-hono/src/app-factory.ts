import { swaggerUI } from "@hono/swagger-ui";
import type { ServerProviderDeps } from "@voltagent/core";
import {
  getLandingPageHTML,
  getOpenApiDoc,
  getOrCreateLogger,
  shouldEnableSwaggerUI,
} from "@voltagent/server-core";
import { cors } from "hono/cors";
import { createAuthMiddleware } from "./auth/middleware";
import {
  registerA2ARoutes,
  registerAgentRoutes,
  registerLogRoutes,
  registerMcpRoutes,
  registerObservabilityRoutes,
  registerUpdateRoutes,
  registerWorkflowRoutes,
} from "./routes";
import type { HonoServerConfig } from "./types";
import { getEnhancedOpenApiDoc } from "./utils/custom-endpoints";
import { OpenAPIHono } from "./zod-openapi-compat";

/**
 * Create Hono app with dependencies
 */
export async function createApp(
  deps: ServerProviderDeps,
  config: HonoServerConfig = {},
  port?: number,
) {
  const app = new OpenAPIHono();

  // Get logger from dependencies or use global
  const logger = getOrCreateLogger(deps, "api-server");

  // Track if user has configured CORS
  let userConfiguredCors = false;

  // Allow user to configure the app with custom routes and middleware FIRST
  // This allows users to set up their own CORS, authentication, and other middleware
  // before the default middleware is applied
  if (config.configureApp) {
    // Wrap the app to detect if CORS was configured
    const originalUse = app.use.bind(app);
    app.use = ((...args: any[]) => {
      // Check if cors middleware is being registered
      // Note: Hono's cors function is named 'cors2' (not 'cors')
      const middleware = args[args.length - 1];
      if (middleware && middleware.name === "cors2") {
        userConfiguredCors = true;
      }
      return originalUse(...args);
    }) as any;

    await config.configureApp(app);
    logger.debug("Custom app configuration applied");

    // Restore original use method
    app.use = originalUse;
  }

  // Setup default CORS only if user hasn't configured it
  if (!userConfiguredCors) {
    app.use("*", cors());
  }

  // Setup Authentication if provided
  if (config.auth) {
    app.use("*", createAuthMiddleware(config.auth));
  }

  // Landing page
  app.get("/", (c) => {
    return c.html(getLandingPageHTML());
  });

  // Register all routes with dependencies
  registerAgentRoutes(app as any, deps, logger);
  registerWorkflowRoutes(app as any, deps, logger);
  registerLogRoutes(app as any, deps, logger);
  registerUpdateRoutes(app as any, deps, logger);
  registerObservabilityRoutes(app as any, deps, logger);
  // Cast preserves compatibility when multiple copies of core types exist at build time.
  registerMcpRoutes(app as any, deps as any, logger);
  registerA2ARoutes(app as any, deps as any, logger);

  // Allow user to configure the app with custom routes and middleware
  if (config.configureApp) {
    await config.configureApp(app);
    logger.debug("Custom app configuration applied");
  }

  // Setup Swagger UI and OpenAPI documentation AFTER custom routes are registered
  // This ensures custom endpoints are included in the documentation
  if (shouldEnableSwaggerUI(config)) {
    app.get("/ui", swaggerUI({ url: "/doc" }));
  }

  // Setup enhanced OpenAPI documentation that includes custom endpoints
  app.get("/doc", (c) => {
    const baseDoc = getOpenApiDoc(port || config.port || 3141);
    const result = getEnhancedOpenApiDoc(app, baseDoc);
    return c.json(result);
  });

  return { app };
}

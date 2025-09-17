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
  registerAgentRoutes,
  registerLogRoutes,
  registerObservabilityRoutes,
  registerUpdateRoutes,
  registerWorkflowRoutes,
} from "./routes";
import type { HonoServerConfig } from "./types";
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

  // Setup CORS
  app.use("*", cors());

  // Setup Authentication if provided
  if (config.auth) {
    app.use("*", createAuthMiddleware(config.auth));
  }

  // Setup Swagger UI if enabled
  if (shouldEnableSwaggerUI(config)) {
    app.get("/ui", swaggerUI({ url: "/doc" }));
  }

  // Setup OpenAPI documentation with dynamic port
  app.doc("/doc", getOpenApiDoc(port || config.port || 3141));

  // Landing page
  app.get("/", (c) => {
    return c.html(getLandingPageHTML());
  });

  // Register all routes with dependencies
  registerAgentRoutes(app, deps, logger);
  registerWorkflowRoutes(app, deps, logger);
  registerLogRoutes(app, deps, logger);
  registerUpdateRoutes(app, deps, logger);
  registerObservabilityRoutes(app, deps, logger);

  // Allow user to configure the app with custom routes and middleware
  if (config.configureApp) {
    await config.configureApp(app);
    logger.debug("Custom app configuration applied");
  }

  return { app };
}

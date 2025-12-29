import { swaggerUI } from "@hono/swagger-ui";
import type { ServerProviderDeps } from "@voltagent/core";
import {
  getLandingPageHTML,
  getOpenApiDoc,
  getOrCreateLogger,
  shouldEnableSwaggerUI,
} from "@voltagent/server-core";
import { cors } from "hono/cors";
import { createAuthMiddleware, createAuthNextMiddleware } from "./auth/middleware";
import {
  registerA2ARoutes,
  registerAgentRoutes,
  registerLogRoutes,
  registerMcpRoutes,
  registerObservabilityRoutes,
  registerToolRoutes,
  registerTriggerRoutes,
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
  // Register all routes with dependencies
  const routes = {
    agents: () => registerAgentRoutes(app as any, deps, logger),
    workflows: () => registerWorkflowRoutes(app as any, deps, logger),
    logs: () => registerLogRoutes(app as any, deps, logger),
    updates: () => registerUpdateRoutes(app as any, deps, logger),
    observability: () => registerObservabilityRoutes(app as any, deps, logger),
    tools: () => registerToolRoutes(app as any, deps as any, logger),
    triggers: () => registerTriggerRoutes(app as any, deps, logger),
    mcp: () => registerMcpRoutes(app as any, deps as any, logger),
    a2a: () => registerA2ARoutes(app as any, deps as any, logger),
    doc: () => {
      app.get("/doc", (c) => {
        const baseDoc = getOpenApiDoc(port || config.port || 3141);
        const result = getEnhancedOpenApiDoc(app, baseDoc);
        return c.json(result);
      });
    },
    ui: () => {
      if (shouldEnableSwaggerUI(config)) {
        app.get("/ui", swaggerUI({ url: "/doc" }));
      }
    },
  };

  const middlewares = {
    cors: () => {
      if (config.cors !== false) {
        app.use("*", cors(config.cors as Parameters<typeof cors>[0]));
      }
    },
    auth: () => {
      if (config.authNext && config.auth) {
        logger.warn("Both authNext and auth are set. authNext will take precedence.");
      }

      if (config.authNext) {
        app.use("*", createAuthNextMiddleware(config.authNext));
        return;
      }

      if (config.auth) {
        logger.warn("auth is deprecated. Use authNext to protect all routes by default.");
        app.use("*", createAuthMiddleware(config.auth));
      }
    },
    landingPage: () => {
      app.get("/", (c) => {
        return c.html(getLandingPageHTML());
      });
    },
  };

  // If configureFullApp is set, do nothing and let the user configure the app manually
  // Attention: configureFullApp is not compatible with configureApp and it's a low level function for those who need total control over how the routes, middlewares, auth cors, etc. are configured/implemented.
  if (config.configureFullApp) {
    await config.configureFullApp({ app, routes, middlewares });
    logger.debug("Full app configuration applied");
  } else {
    // Setup CORS with user configuration or defaults
    // Skip if explicitly set to false (allows route-specific CORS in configureApp)
    middlewares.cors();

    // Setup Authentication if provided
    middlewares.auth();
    // Landing page
    middlewares.landingPage();

    // Register all routes with dependencies
    routes.agents();
    routes.workflows();
    routes.tools();
    routes.logs();
    routes.updates();
    routes.observability();
    routes.triggers();
    routes.mcp();
    routes.a2a();

    // Allow user to configure the app with custom routes and middleware
    if (config.configureApp) {
      await config.configureApp(app);
      logger.debug("Custom app configuration applied");
    }

    // Setup Swagger UI and OpenAPI documentation AFTER custom routes are registered
    // This ensures custom endpoints are included in the documentation
    routes.ui();

    // Setup enhanced OpenAPI documentation that includes custom endpoints
    routes.doc();
  }

  return { app };
}

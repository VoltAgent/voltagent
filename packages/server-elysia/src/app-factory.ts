import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import type { ServerProviderDeps } from "@voltagent/core";
import {
  getLandingPageHTML,
  getOpenApiDoc,
  getOrCreateLogger,
  shouldEnableSwaggerUI,
} from "@voltagent/server-core";
import { Elysia } from "elysia";
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
import type { ElysiaServerConfig } from "./types";
import { getEnhancedOpenApiDoc } from "./utils/custom-endpoints";

/**
 * Create Elysia app with dependencies
 */
export async function createApp(
  deps: ServerProviderDeps,
  config: ElysiaServerConfig = {},
  port?: number,
) {
  const app = new Elysia();

  // Add state for authenticatedUser that will be set by auth middleware
  app.state("authenticatedUser", null as any);

  // Get logger from dependencies or use global
  const logger = getOrCreateLogger(deps, "api-server");

  // Register all routes with dependencies
  const routes = {
    agents: () => registerAgentRoutes(app, deps, logger),
    workflows: () => registerWorkflowRoutes(app, deps, logger),
    logs: () => registerLogRoutes(app, deps, logger),
    updates: () => registerUpdateRoutes(app, deps, logger),
    observability: () => registerObservabilityRoutes(app, deps, logger),
    tools: () => registerToolRoutes(app, deps, logger),
    triggers: () => registerTriggerRoutes(app, deps, logger),
    mcp: () => registerMcpRoutes(app, deps as any, logger),
    a2a: () => registerA2ARoutes(app, deps as any, logger),
    doc: () => {
      app.get("/doc", () => {
        const baseDoc = getOpenApiDoc(port || config.port || 3141);
        const result = getEnhancedOpenApiDoc(app, baseDoc);
        return result;
      });
    },
    ui: () => {
      if (shouldEnableSwaggerUI(config)) {
        app.use(
          swagger({
            path: "/ui",
            documentation: {
              info: {
                title: "VoltAgent API",
                version: "1.0.0",
              },
            },
          }),
        );
      }
    },
  };

  const middlewares = {
    cors: () => {
      if (config.cors !== false) {
        const corsConfig: any = {
          origin: config.cors?.origin || "*",
          methods: config.cors?.allowMethods || ["GET", "POST", "PUT", "DELETE", "PATCH"],
          allowedHeaders: config.cors?.allowHeaders || ["Content-Type", "Authorization"],
          credentials: config.cors?.credentials,
          maxAge: config.cors?.maxAge,
        };
        app.use(cors(corsConfig));
      }
    },
    auth: () => {
      if (config.authNext && config.auth) {
        logger.warn("Both authNext and auth are set. authNext will take precedence.");
      }

      if (config.authNext) {
        app.onBeforeHandle(createAuthNextMiddleware(config.authNext));
        return;
      }

      if (config.auth) {
        logger.warn("auth is deprecated. Use authNext to protect all routes by default.");
        app.onBeforeHandle(createAuthMiddleware(config.auth));
      }
    },
    landingPage: () => {
      app.get("/", () => {
        return new Response(getLandingPageHTML(), {
          headers: { "Content-Type": "text/html" },
        });
      });
    },
  };

  // If configureFullApp is set, do nothing and let the user configure the app manually
  // Attention: configureFullApp is not compatible with configureApp and it's a low level function for those who need total control
  if (config.configureFullApp) {
    await config.configureFullApp({ app, routes, middlewares });
    logger.debug("Full app configuration applied");
  } else {
    // Setup CORS with user configuration or defaults
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
    routes.ui();

    // Setup enhanced OpenAPI documentation that includes custom endpoints
    routes.doc();
  }

  return { app };
}

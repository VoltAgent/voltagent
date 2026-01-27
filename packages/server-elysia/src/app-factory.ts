import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import type { ServerProviderDeps } from "@voltagent/core";
import { resolveResumableStreamDeps } from "@voltagent/resumable-streams";
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
  registerMemoryRoutes,
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

  // Resolve resumable stream dependencies (like server-hono does)
  const resumableStreamConfig = config.resumableStream;
  const baseDeps = await resolveResumableStreamDeps(deps, resumableStreamConfig?.adapter, logger);
  const resumableStreamDefault =
    typeof resumableStreamConfig?.defaultEnabled === "boolean"
      ? resumableStreamConfig.defaultEnabled
      : baseDeps.resumableStreamDefault;
  const resolvedDeps: ServerProviderDeps = {
    ...baseDeps,
    ...(resumableStreamDefault !== undefined ? { resumableStreamDefault } : {}),
  };

  // Register all routes with dependencies
  const routes = {
    agents: () => registerAgentRoutes(app, resolvedDeps, logger),
    workflows: () => registerWorkflowRoutes(app, resolvedDeps, logger),
    logs: () => registerLogRoutes(app, resolvedDeps, logger),
    updates: () => registerUpdateRoutes(app, resolvedDeps, logger),
    observability: () => registerObservabilityRoutes(app, resolvedDeps, logger),
    memory: () => registerMemoryRoutes(app, resolvedDeps, logger),
    tools: () => registerToolRoutes(app, resolvedDeps, logger),
    triggers: () => registerTriggerRoutes(app, resolvedDeps, logger),
    mcp: () => registerMcpRoutes(app, resolvedDeps, logger),
    a2a: () => registerA2ARoutes(app, resolvedDeps, logger),
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
        app.use(
          cors({
            origin: config.cors?.origin ?? "*",
            methods: config.cors?.allowMethods ?? ["GET", "POST", "PUT", "DELETE", "PATCH"],
            allowedHeaders: config.cors?.allowHeaders ?? ["Content-Type", "Authorization"],
            credentials: config.cors?.credentials ?? false,
            maxAge: config.cors?.maxAge ?? 86400,
            exposeHeaders: config.cors?.exposeHeaders,
          } as Parameters<typeof cors>[0]),
        );
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
    routes.memory();
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

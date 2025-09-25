import type { ServerProviderDeps } from "@voltagent/core/edge";
import type { Logger } from "@voltagent/internal";
import { getOrCreateLogger } from "@voltagent/server-core/edge";
import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  registerA2ARoutes,
  registerAgentRoutes,
  registerLogRoutes,
  registerObservabilityRoutes,
  registerWorkflowRoutes,
} from "./routes";
import type { EdgeConfig } from "./types";

function resolveCorsConfig(config?: EdgeConfig) {
  const origin = config?.corsOrigin ?? "*";
  const allowMethods = config?.corsAllowMethods ?? [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ];
  const allowHeaders = config?.corsAllowHeaders ?? ["Content-Type", "Authorization"];

  return {
    origin,
    allowMethods,
    allowHeaders,
  };
}

export async function createEdgeApp(deps: ServerProviderDeps, config?: EdgeConfig) {
  const app = new Hono();
  const logger: Logger = getOrCreateLogger(deps, "edge-server");

  const corsConfig = resolveCorsConfig(config);
  app.use("*", cors(corsConfig));

  app.get("/", (c) =>
    c.json({
      name: "VoltAgent Edge",
      message: "VoltAgent edge runtime is running",
    }),
  );

  registerAgentRoutes(app, deps, logger);
  registerWorkflowRoutes(app, deps, logger);
  registerLogRoutes(app, deps, logger);
  registerObservabilityRoutes(app, deps, logger);
  registerA2ARoutes(app, deps, logger);

  if (config?.configureApp) {
    await config.configureApp(app, deps);
  }

  return app;
}

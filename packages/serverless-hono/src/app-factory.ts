import type { ServerProviderDeps } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import { getOrCreateLogger } from "@voltagent/server-core";
import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  registerA2ARoutes,
  registerAgentRoutes,
  registerLogRoutes,
  registerObservabilityRoutes,
  registerTriggerRoutes,
  registerUpdateRoutes,
  registerWorkflowRoutes,
} from "./routes";
import type { ServerlessConfig } from "./types";

function resolveCorsConfig(config?: ServerlessConfig) {
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

export async function createServerlessApp(deps: ServerProviderDeps, config?: ServerlessConfig) {
  const app = new Hono();
  const logger: Logger = getOrCreateLogger(deps, "serverless");

  const corsConfig = resolveCorsConfig(config);
  app.use("*", cors(corsConfig));

  app.get("/", (c) =>
    c.json({
      name: "VoltAgent Serverless",
      message: "VoltAgent serverless runtime is running",
    }),
  );

  // Provide a friendly response for WebSocket probes (Console UI polls /ws)
  app.get("/ws", (c) =>
    c.json(
      {
        success: false,
        error:
          "WebSocket streaming is not implemented in the serverless runtime yet. Falling back to HTTP polling.",
      },
      200,
    ),
  );

  registerAgentRoutes(app, deps, logger);
  registerWorkflowRoutes(app, deps, logger);
  registerLogRoutes(app, deps, logger);
  registerUpdateRoutes(app, deps, logger);
  registerObservabilityRoutes(app, deps, logger);
  registerTriggerRoutes(app, deps, logger);
  registerA2ARoutes(app, deps, logger);

  if (config?.configureApp) {
    await config.configureApp(app, deps);
  }

  return app;
}

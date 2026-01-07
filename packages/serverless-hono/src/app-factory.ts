import type { ServerProviderDeps } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import { resolveResumableStreamDeps } from "@voltagent/resumable-streams";
import { getOrCreateLogger } from "@voltagent/server-core";
import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  registerA2ARoutes,
  registerAgentRoutes,
  registerLogRoutes,
  registerObservabilityRoutes,
  registerToolRoutes,
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
  const allowHeaders = config?.corsAllowHeaders ?? [
    "Content-Type",
    "Authorization",
    "x-voltagent-dev",
    "x-console-access-key",
  ];

  return {
    origin,
    allowMethods,
    allowHeaders,
  };
}

export async function createServerlessApp(deps: ServerProviderDeps, config?: ServerlessConfig) {
  const app = new Hono();
  const logger: Logger = getOrCreateLogger(deps, "serverless");
  const resumableStreamConfig = config?.resumableStream;
  const baseDeps = await resolveResumableStreamDeps(deps, resumableStreamConfig?.adapter, logger);
  const resumableStreamDefault =
    typeof resumableStreamConfig?.defaultEnabled === "boolean"
      ? resumableStreamConfig.defaultEnabled
      : baseDeps.resumableStreamDefault;
  const resolvedDeps: ServerProviderDeps = {
    ...baseDeps,
    ...(resumableStreamDefault !== undefined ? { resumableStreamDefault } : {}),
  };

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

  registerAgentRoutes(app, resolvedDeps, logger);
  registerWorkflowRoutes(app, resolvedDeps, logger);
  registerToolRoutes(app, resolvedDeps, logger);
  registerLogRoutes(app, resolvedDeps, logger);
  registerUpdateRoutes(app, resolvedDeps, logger);
  registerObservabilityRoutes(app, resolvedDeps, logger);
  registerTriggerRoutes(app, resolvedDeps, logger);
  registerA2ARoutes(app, resolvedDeps, logger);

  if (config?.configureApp) {
    await config.configureApp(app, resolvedDeps);
  }

  return app;
}

/**
 * Observability route handlers for Hono
 */

import type { ServerProviderDeps } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import {
  OBSERVABILITY_ROUTES,
  getLogsBySpanIdHandler,
  getLogsByTraceIdHandler,
  getObservabilityStatusHandler,
  getSpanByIdHandler,
  getTraceByIdHandler,
  getTracesHandler,
  queryLogsHandler,
  setupObservabilityHandler,
} from "@voltagent/server-core";
import type { OpenAPIHonoType } from "../zod-openapi-compat";

/**
 * Register observability routes
 */
export function registerObservabilityRoutes(
  app: OpenAPIHonoType,
  deps: ServerProviderDeps,
  logger: Logger,
) {
  // Setup observability configuration
  app.post(OBSERVABILITY_ROUTES.setupObservability.path, async (c) => {
    const body = await c.req.json();
    logger.trace("POST /setup-observability - configuring observability", {
      hasKeys: !!(body.publicKey && body.secretKey),
    });
    const result = await setupObservabilityHandler(body, deps);
    return c.json(result, result.success ? 200 : result.error?.includes("Missing") ? 400 : 500);
  });

  // Get all traces with optional agentId filter
  app.get(OBSERVABILITY_ROUTES.getTraces.path, async (c) => {
    const query = c.req.query();
    logger.trace("GET /observability/traces - fetching traces", { query });
    const result = await getTracesHandler(deps, query);
    return c.json(result, result.success ? 200 : 500);
  });

  // Get specific trace by ID
  app.get(OBSERVABILITY_ROUTES.getTraceById.path, async (c) => {
    const traceId = c.req.param("traceId");
    logger.trace(`GET /observability/traces/${traceId} - fetching trace`);
    const result = await getTraceByIdHandler(traceId, deps);
    return c.json(result, result.success ? 200 : 404);
  });

  // Get specific span by ID
  app.get(OBSERVABILITY_ROUTES.getSpanById.path, async (c) => {
    const spanId = c.req.param("spanId");
    logger.trace(`GET /observability/spans/${spanId} - fetching span`);
    const result = await getSpanByIdHandler(spanId, deps);
    return c.json(result, result.success ? 200 : 404);
  });

  // Get observability status
  app.get(OBSERVABILITY_ROUTES.getObservabilityStatus.path, async (c) => {
    logger.trace("GET /observability/status - fetching status");
    const result = await getObservabilityStatusHandler(deps);
    return c.json(result, result.success ? 200 : 500);
  });

  // Get logs by trace ID
  app.get(OBSERVABILITY_ROUTES.getLogsByTraceId.path, async (c) => {
    const traceId = c.req.param("traceId");
    logger.trace(`GET /observability/traces/${traceId}/logs - fetching logs`);
    const result = await getLogsByTraceIdHandler(traceId, deps);
    return c.json(result, result.success ? 200 : 404);
  });

  // Get logs by span ID
  app.get(OBSERVABILITY_ROUTES.getLogsBySpanId.path, async (c) => {
    const spanId = c.req.param("spanId");
    logger.trace(`GET /observability/spans/${spanId}/logs - fetching logs`);
    const result = await getLogsBySpanIdHandler(spanId, deps);
    return c.json(result, result.success ? 200 : 404);
  });

  // Query logs with filters
  app.get(OBSERVABILITY_ROUTES.queryLogs.path, async (c) => {
    const query = c.req.query();
    logger.trace("GET /observability/logs - querying logs", { query });
    const result = await queryLogsHandler(query, deps);
    return c.json(result, result.success ? 200 : 400);
  });
}

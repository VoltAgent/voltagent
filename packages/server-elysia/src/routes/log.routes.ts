import type { ServerProviderDeps } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import { handleGetLogs, mapLogResponse } from "@voltagent/server-core";
import type { Elysia } from "elysia";
import { t } from "elysia";
import { ErrorSchema, LogResponseSchema } from "../schemas";

/**
 * Log query parameters schema
 */
const LogQuerySchema = t.Object({
  limit: t.Optional(
    t.Number({
      minimum: 1,
      maximum: 1000,
      description: "Maximum number of log entries to return",
    }),
  ),
  level: t.Optional(
    t.Union([t.Literal("debug"), t.Literal("info"), t.Literal("warn"), t.Literal("error")], {
      description: "Filter by log level",
    }),
  ),
  agentId: t.Optional(t.String({ description: "Filter by agent ID" })),
  workflowId: t.Optional(t.String({ description: "Filter by workflow ID" })),
  conversationId: t.Optional(t.String({ description: "Filter by conversation ID" })),
  executionId: t.Optional(t.String({ description: "Filter by execution ID" })),
  since: t.Optional(
    t.String({
      description: "Return logs since this timestamp (ISO 8601 format)",
    }),
  ),
  until: t.Optional(
    t.String({
      description: "Return logs until this timestamp (ISO 8601 format)",
    }),
  ),
});

/**
 * Register log routes with validation and OpenAPI documentation
 */
export function registerLogRoutes(app: Elysia, deps: ServerProviderDeps, logger: Logger): void {
  // GET /api/logs - Get logs with filters
  app.get(
    "/api/logs",
    async ({ query }) => {
      const options = {
        limit: query.limit ? Number(query.limit) : undefined,
        level: query.level as "debug" | "info" | "warn" | "error" | undefined,
        agentId: query.agentId as string | undefined,
        workflowId: query.workflowId as string | undefined,
        conversationId: query.conversationId as string | undefined,
        executionId: query.executionId as string | undefined,
        since: query.since,
        until: query.until,
      };

      const response = await handleGetLogs(options, deps, logger);

      if (!response.success) {
        throw new Error("Failed to get logs");
      }

      // Map the response to match the OpenAPI schema
      const mappedResponse = mapLogResponse(response);
      return mappedResponse;
    },
    {
      query: LogQuerySchema,
      response: {
        200: LogResponseSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Get logs",
        description: "Retrieve system logs with optional filtering",
        tags: ["Logs"],
      },
    },
  );
}

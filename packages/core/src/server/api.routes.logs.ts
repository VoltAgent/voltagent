import { createRoute, z } from "@hono/zod-openapi";

// Common Error Response Schema (reuse from main routes)
const ErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().openapi({ description: "Error message" }),
});

// Log Entry Schema
export const LogEntrySchema = z.object({
  timestamp: z.string(),
  level: z.string(),
  msg: z.string(),
  component: z.string().optional(),
  agentId: z.string().optional(),
  conversationId: z.string().optional(),
  workflowId: z.string().optional(),
  executionId: z.string().optional(),
  userId: z.string().optional(),
});

// Log Query Schema
export const LogQuerySchema = z.object({
  limit: z.number().int().positive().max(1000).optional().default(100).openapi({
    description: "Maximum number of log entries to return",
    example: 100,
  }),
  level: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).optional().openapi({
    description: "Minimum log level to filter by",
    example: "info",
  }),
  agentId: z.string().optional().openapi({
    description: "Filter logs by agent ID",
    example: "agent-123",
  }),
  conversationId: z.string().optional().openapi({
    description: "Filter logs by conversation ID",
    example: "conv-456",
  }),
  workflowId: z.string().optional().openapi({
    description: "Filter logs by workflow ID",
    example: "workflow-789",
  }),
  executionId: z.string().optional().openapi({
    description: "Filter logs by workflow execution ID",
    example: "exec-012",
  }),
  since: z.string().datetime().optional().openapi({
    description: "Return logs since this timestamp (ISO 8601)",
    example: "2024-01-01T00:00:00Z",
  }),
  until: z.string().datetime().optional().openapi({
    description: "Return logs until this timestamp (ISO 8601)",
    example: "2024-01-01T23:59:59Z",
  }),
});

// Log Response Schema
export const LogEntriesResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(LogEntrySchema),
  total: z.number().int(),
  query: LogQuerySchema,
});

// Get Logs Route
export const getLogsRoute = createRoute({
  method: "get",
  path: "/api/logs",
  request: {
    query: LogQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: LogEntriesResponseSchema,
        },
      },
      description: "Successfully retrieved log entries",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Server error",
    },
  },
  tags: ["Logging"],
});

import { z } from "zod";

/**
 * Zod schemas for A2A task-related types.
 *
 * These are the **single source of truth** — the corresponding TypeScript
 * types in `./types.ts` are derived via `z.infer` so the runtime validation
 * and static types can never drift apart.
 */

export const TaskStateSchema = z.enum([
  "submitted",
  "working",
  "input-required",
  "completed",
  "failed",
  "canceled",
]);

export const A2AMessagePartTextSchema = z.object({
  kind: z.literal("text"),
  text: z.string(),
});

/**
 * Currently only `text` parts exist. When new part kinds are added, extend
 * this with `z.discriminatedUnion("kind", [...])`.
 */
export const A2AMessagePartSchema = A2AMessagePartTextSchema;

export const A2AMessageSchema = z.object({
  kind: z.literal("message"),
  role: z.enum(["user", "agent"]),
  messageId: z.string(),
  parts: z.array(A2AMessagePartSchema),
  contextId: z.string().optional(),
  taskId: z.string().optional(),
  referenceTaskIds: z.array(z.string()).optional(),
  extensions: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const TaskStatusSchema = z.object({
  state: TaskStateSchema,
  message: A2AMessageSchema.optional(),
  timestamp: z.string(),
});

export const TaskArtifactPartSchema = z.object({
  kind: z.literal("text"),
  text: z.string(),
});

export const TaskArtifactSchema = z.object({
  name: z.string(),
  parts: z.array(TaskArtifactPartSchema),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const TaskRecordSchema = z.object({
  id: z.string(),
  contextId: z.string(),
  status: TaskStatusSchema,
  history: z.array(A2AMessageSchema),
  artifacts: z.array(TaskArtifactSchema).optional(),
  metadata: z.record(z.unknown()).optional(),
});

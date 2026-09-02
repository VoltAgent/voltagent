import { z } from "zod";

/**
 * Zod schemas for A2A task-related types.
 *
 * These are the **single source of truth** — the corresponding TypeScript
 * types in `./types.ts` are derived via `z.infer` so the runtime validation
 * and static types can never drift apart.
 */

/** Zod schema for the set of valid task lifecycle states. */
export const TaskStateSchema = z.enum([
  "submitted",
  "working",
  "input-required",
  "completed",
  "failed",
  "canceled",
]);

/** Zod schema for a text-only message part. */
export const A2AMessagePartTextSchema = z.object({
  kind: z.literal("text"),
  text: z.string(),
});

/** Zod schema for a message part. Currently only `text` parts exist; extend with `z.discriminatedUnion` when new kinds are added. */
export const A2AMessagePartSchema = A2AMessagePartTextSchema;

/** Zod schema for a single A2A message (user or agent). */
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

/** Zod schema for a task's current status including state and timestamp. */
export const TaskStatusSchema = z.object({
  state: TaskStateSchema,
  message: A2AMessageSchema.optional(),
  timestamp: z.string(),
});

/** Zod schema for a text-only artifact part. */
export const TaskArtifactPartSchema = z.object({
  kind: z.literal("text"),
  text: z.string(),
});

/** Zod schema for an artifact produced by an agent during task execution. */
export const TaskArtifactSchema = z.object({
  name: z.string(),
  parts: z.array(TaskArtifactPartSchema),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/** Zod schema for a complete task record including status, history, and optional artifacts. */
export const TaskRecordSchema = z.object({
  id: z.string(),
  contextId: z.string(),
  status: TaskStatusSchema,
  history: z.array(A2AMessageSchema),
  artifacts: z.array(TaskArtifactSchema).optional(),
  metadata: z.record(z.unknown()).optional(),
});

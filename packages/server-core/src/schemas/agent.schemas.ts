import { z } from "zod";

// Common schemas
export const ParamsSchema = z.object({
  id: z.string().describe("The ID of the agent"),
});

// Parameter schemas for different endpoints
export const AgentParamsSchema = z.object({
  id: z.string().describe("The ID of the agent"),
});

export const WorkflowParamsSchema = z.object({
  id: z.string().describe("The ID of the workflow"),
});

export const WorkflowExecutionParamsSchema = z.object({
  id: z.string().describe("The ID of the workflow"),
  executionId: z.string().describe("The ID of the execution to operate on"),
});

export const ErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe("Error message"),
});

// Agent schemas
export const SubAgentResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    status: z.string().describe("Current status of the sub-agent"),
    model: z.string(),
    tools: z.array(z.any()).optional(),
    memory: z.any().optional(),
  })
  .passthrough();

export const AgentResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    status: z.string().describe("Current status of the agent"),
    model: z.string(),
    tools: z.array(z.any()),
    subAgents: z.array(SubAgentResponseSchema).optional().describe("List of sub-agents"),
    memory: z.any().optional(),
    isTelemetryEnabled: z.boolean().describe("Indicates if telemetry is configured for the agent"),
  })
  .passthrough();

// Response list schemas
export const AgentListSchema = z
  .array(AgentResponseSchema)
  .describe("Array of agent objects with their configurations");

// Basic JSON schema for structured output (used in both output and object generation)
export const BasicJsonSchema = z
  .object({
    type: z.literal("object"),
    properties: z
      .record(z.string(), z.unknown())
      .nullish()
      .describe("A dictionary defining each property of the object and its type"),
    required: z
      .array(z.string())
      .optional()
      .describe("List of required property names in the object"),
  })
  .passthrough()
  .describe("The Zod schema for the desired object output (passed as JSON)");

const FeedbackConfigSchema = z
  .object({
    type: z.enum(["continuous", "categorical", "freeform"]),
    min: z.number().optional(),
    max: z.number().optional(),
    categories: z
      .array(
        z.object({
          value: z.union([z.string(), z.number()]),
          label: z.string().optional(),
          description: z.string().optional(),
        }),
      )
      .optional(),
  })
  .passthrough()
  .describe("Feedback configuration for the trace");

const FeedbackExpiresInSchema = z
  .object({
    days: z.number().int().optional(),
    hours: z.number().int().optional(),
    minutes: z.number().int().optional(),
  })
  .passthrough()
  .describe("Relative expiration for feedback tokens");

const FeedbackOptionsSchema = z
  .object({
    key: z.string().optional().describe("Feedback key for the trace"),
    feedbackConfig: FeedbackConfigSchema.nullish().optional(),
    expiresAt: z.string().optional().describe("Absolute expiration timestamp (ISO 8601)"),
    expiresIn: FeedbackExpiresInSchema.optional(),
  })
  .passthrough()
  .describe("Feedback options for the generated trace");

// Generation options schema
export const GenerateOptionsSchema = z
  .object({
    userId: z
      .string()
      .optional()
      .describe("Optional user ID for context tracking (required for resumable streams)"),
    conversationId: z.string().optional().describe("Optional conversation ID for context tracking"),
    context: z
      .record(z.string(), z.unknown())
      .nullish()
      .describe("User context for dynamic agent behavior"),
    contextLimit: z
      .number()
      .int()
      .positive()
      .optional()
      .default(10)
      .describe("Optional limit for conversation history context"),
    maxSteps: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Maximum number of steps for this request"),
    temperature: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .default(0.7)
      .describe("Controls randomness (0-1)"),
    maxOutputTokens: z
      .number()
      .int()
      .positive()
      .optional()
      .default(4000)
      .describe("Maximum tokens to generate"),
    topP: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .default(1.0)
      .describe("Controls diversity via nucleus sampling (0-1)"),
    frequencyPenalty: z
      .number()
      .min(0)
      .max(2)
      .optional()
      .default(0.0)
      .describe("Penalizes repeated tokens (0-2)"),
    presencePenalty: z
      .number()
      .min(0)
      .max(2)
      .optional()
      .default(0.0)
      .describe("Penalizes tokens based on presence (0-2)"),
    seed: z.number().int().optional().describe("Optional seed for reproducible results"),
    stopSequences: z.array(z.string()).optional().describe("Stop sequences to end generation"),
    providerOptions: z
      .record(z.string(), z.unknown())
      .nullish()
      .describe("Provider-specific options for AI SDK providers (e.g., OpenAI's reasoningEffort)"),
    resumableStream: z
      .boolean()
      .optional()
      .describe(
        "When true, avoids wiring the HTTP abort signal into streams so they can be resumed (requires resumable streams and options.conversationId + options.userId). If omitted, server defaults may apply.",
      ),
    output: z
      .object({
        type: z
          .enum(["object", "text"])
          .describe("Output type: 'object' for structured JSON, 'text' for text-only output"),
        schema: BasicJsonSchema.optional().describe(
          "JSON schema for structured output (required when type is 'object')",
        ),
      })
      .optional()
      .describe("Structured output configuration for schema-guided generation"),
    feedback: z
      .union([z.boolean(), FeedbackOptionsSchema])
      .optional()
      .describe("Enable or configure feedback tokens for the trace"),
  })
  .passthrough();

// Text generation schemas
export const TextRequestSchema = z.object({
  input: z
    .union([
      z.string().describe("Direct text input"),
      z.array(z.any()).describe("AI SDK message array (UIMessage or ModelMessage format)"),
    ])
    .describe("Input text or messages array - accepts string, UIMessage[], or ModelMessage[]"),
  options: GenerateOptionsSchema.optional().describe("Optional generation parameters"),
});

export const TextResponseSchema = z.object({
  success: z.literal(true),
  data: z.union([
    z.string().describe("Generated text response (legacy)"),
    z
      .object({
        text: z.string(),
        usage: z
          .object({
            promptTokens: z.number(),
            completionTokens: z.number(),
            totalTokens: z.number(),
            cachedInputTokens: z.number().optional(),
            reasoningTokens: z.number().optional(),
          })
          .optional(),
        finishReason: z.string().optional(),
        toolCalls: z.array(z.any()).optional(),
        toolResults: z.array(z.any()).optional(),
        output: z.any().optional().describe("Structured output when output is used"),
        feedback: z
          .object({
            traceId: z.string(),
            key: z.string(),
            url: z.string(),
            tokenId: z.string().optional(),
            expiresAt: z.string().optional(),
            feedbackConfig: FeedbackConfigSchema.nullish().optional(),
          })
          .nullable()
          .optional()
          .describe("Feedback metadata for the trace"),
      })
      .describe("AI SDK formatted response"),
  ]),
});

// Stream schemas
export const StreamTextEventSchema = z.object({
  text: z.string().optional(),
  timestamp: z.string().datetime().optional(),
  type: z.enum(["text", "completion", "error"]).optional(),
  done: z.boolean().optional(),
  error: z.string().optional(),
});

// Object generation schemas
export const ObjectRequestSchema = z.object({
  input: z
    .union([
      z.string().describe("Direct text input"),
      z.array(z.any()).describe("AI SDK message array (UIMessage or ModelMessage format)"),
    ])
    .describe("Input text or messages array - accepts string, UIMessage[], or ModelMessage[]"),
  schema: BasicJsonSchema,
  options: GenerateOptionsSchema.optional().describe("Optional object generation parameters"),
});

export const ObjectResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({}).passthrough().describe("Generated object response"),
});

export const StreamObjectEventSchema = z
  .any()
  .describe("Streamed object parts or the final object");

// Workflow schemas
export const WorkflowResponseSchema = z.object({
  id: z.string().describe("Unique workflow identifier"),
  name: z.string().describe("Human-readable workflow name"),
  purpose: z.string().describe("Description of what the workflow does"),
  stepsCount: z.number().int().describe("Number of steps in the workflow"),
  status: z
    .enum(["idle", "running", "completed", "error"])
    .describe("Current status of the workflow"),
});

export const WorkflowListSchema = z
  .array(WorkflowResponseSchema)
  .describe("Array of workflow objects with their configurations");

export const WorkflowExecutionRequestSchema = z.object({
  input: z.any().describe("Input data for the workflow"),
  options: z
    .object({
      userId: z.string().optional(),
      conversationId: z.string().optional(),
      context: z.any().optional(),
    })
    .optional()
    .describe("Optional execution options"),
});

export const WorkflowExecutionResponseSchema = z.object({
  success: z.literal(true),
  data: z
    .object({
      executionId: z.string(),
      startAt: z.string(),
      endAt: z.string(),
      status: z.literal("completed"),
      result: z.any(),
    })
    .describe("Workflow execution result"),
});

export const WorkflowStreamEventSchema = z.object({
  type: z.string().describe("Event type"),
  executionId: z.string().describe("Workflow execution ID"),
  from: z.string().describe("Source of the event"),
  input: z.any().optional(),
  output: z.any().optional(),
  status: z.enum(["pending", "running", "success", "error", "suspended", "cancelled"]),
  timestamp: z.string(),
  stepIndex: z.number().optional(),
  metadata: z.record(z.string(), z.any()).nullish(),
  error: z.any().optional(),
});

export const WorkflowSuspendRequestSchema = z.object({
  reason: z.string().optional().describe("Reason for suspension"),
});

export const WorkflowSuspendResponseSchema = z.object({
  success: z.literal(true),
  data: z
    .object({
      executionId: z.string(),
      status: z.literal("suspended"),
      suspension: z.object({
        suspendedAt: z.string(),
        reason: z.string().optional(),
      }),
    })
    .describe("Workflow suspension result"),
});

export const WorkflowCancelRequestSchema = z.object({
  reason: z.string().optional().describe("Reason for cancellation"),
});

export const WorkflowCancelResponseSchema = z.object({
  success: z.literal(true),
  data: z
    .object({
      executionId: z.string(),
      status: z.literal("cancelled"),
      cancelledAt: z.string(),
      reason: z.string().optional(),
    })
    .describe("Workflow cancellation result"),
});

export const WorkflowResumeRequestSchema = z
  .object({
    resumeData: z
      .any()
      .optional()
      .describe("Data to pass to the resumed step (validated against step's resumeSchema)"),
    options: z
      .object({
        stepId: z
          .string()
          .optional()
          .describe("Optional step ID to resume from a specific step instead of the suspended one"),
      })
      .optional()
      .describe("Optional resume options"),
  })
  .optional();

export const WorkflowResumeResponseSchema = z.object({
  success: z.literal(true),
  data: z
    .object({
      executionId: z.string(),
      startAt: z.string(),
      endAt: z.string().optional(),
      status: z.string(),
      result: z.any(),
    })
    .describe("Workflow resume result"),
});

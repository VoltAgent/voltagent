import { z as defaultZ } from "zod";

type ZodNamespace = typeof defaultZ;

export function createServerCoreSchemas(zod: ZodNamespace = defaultZ) {
  const z = zod;

  // Common schemas
  const ParamsSchema = z.object({
    id: z.string().describe("The ID of the agent"),
  });

  // Parameter schemas for different endpoints
  const AgentParamsSchema = z.object({
    id: z.string().describe("The ID of the agent"),
  });

  const WorkflowParamsSchema = z.object({
    id: z.string().describe("The ID of the workflow"),
  });

  const WorkflowExecutionParamsSchema = z.object({
    id: z.string().describe("The ID of the workflow"),
    executionId: z.string().describe("The ID of the execution to operate on"),
  });

  const ErrorSchema = z.object({
    success: z.literal(false),
    error: z.string().describe("Error message"),
  });

  // Agent schemas
  const SubAgentResponseSchema = z
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

  const AgentResponseSchema = z
    .object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      status: z.string().describe("Current status of the agent"),
      model: z.string(),
      tools: z.array(z.any()),
      subAgents: z.array(SubAgentResponseSchema).optional().describe("List of sub-agents"),
      memory: z.any().optional(),
      isTelemetryEnabled: z
        .boolean()
        .describe("Indicates if telemetry is configured for the agent"),
    })
    .passthrough();

  // Response list schemas
  const AgentListSchema = z
    .array(AgentResponseSchema)
    .describe("Array of agent objects with their configurations");

  // Workspace schemas
  const WorkspaceInfoSchema = z.object({
    id: z.string().describe("Workspace ID"),
    name: z.string().optional().describe("Workspace name"),
    scope: z.enum(["agent", "conversation"]).optional().describe("Workspace scope"),
    capabilities: z.object({
      filesystem: z.boolean().describe("Filesystem access enabled"),
      sandbox: z.boolean().describe("Sandbox execution enabled"),
      search: z.boolean().describe("Search enabled"),
      skills: z.boolean().describe("Skills enabled"),
    }),
  });

  const WorkspaceFileInfoSchema = z.object({
    path: z.string(),
    is_dir: z.boolean(),
    size: z.number().optional(),
    modified_at: z.string().optional(),
  });

  const WorkspaceFileListSchema = z.object({
    path: z.string(),
    entries: z.array(WorkspaceFileInfoSchema),
  });

  const WorkspaceReadFileSchema = z.object({
    path: z.string(),
    content: z.string(),
  });

  const WorkspaceSkillMetadataSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    version: z.string().optional(),
    tags: z.array(z.string()).optional(),
    path: z.string(),
    root: z.string(),
    references: z.array(z.string()).optional(),
    scripts: z.array(z.string()).optional(),
    assets: z.array(z.string()).optional(),
  });

  const WorkspaceSkillListItemSchema = WorkspaceSkillMetadataSchema.extend({
    active: z.boolean().describe("Whether the skill is currently activated"),
  });

  const WorkspaceSkillListSchema = z.object({
    skills: z.array(WorkspaceSkillListItemSchema),
  });

  const WorkspaceSkillSchema = WorkspaceSkillMetadataSchema.extend({
    instructions: z.string(),
  });

  // Basic JSON schema for structured output (used in both output and object generation)
  const BasicJsonSchema = z
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

  const SemanticMemoryOptionsSchema = z
    .object({
      enabled: z
        .boolean()
        .optional()
        .describe(
          "Enable semantic retrieval for this call (default: auto when vectors are available)",
        ),
      semanticLimit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Number of similar messages to retrieve"),
      semanticThreshold: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe("Minimum similarity score (0-1)"),
      mergeStrategy: z
        .enum(["prepend", "append", "interleave"])
        .optional()
        .describe("How semantic results merge with recent history"),
    })
    .passthrough();

  const ConversationPersistenceOptionsSchema = z
    .object({
      mode: z
        .enum(["step", "finish"])
        .optional()
        .describe("Persistence strategy: checkpoint by step or persist on finish"),
      debounceMs: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Debounce window for step checkpoint persistence"),
      flushOnToolResult: z
        .boolean()
        .optional()
        .describe("Flush immediately on tool-result/tool-error in step mode"),
    })
    .passthrough();

  const MessageMetadataPersistenceOptionsSchema = z
    .object({
      usage: z
        .boolean()
        .optional()
        .describe("Persist resolved token usage under message.metadata.usage"),
      finishReason: z
        .boolean()
        .optional()
        .describe("Persist the final finish reason under message.metadata.finishReason"),
    })
    .passthrough();

  const MessageMetadataPersistenceConfigSchema = z
    .union([z.boolean(), MessageMetadataPersistenceOptionsSchema])
    .describe("Controls which assistant message metadata fields are persisted to memory");

  const RuntimeMemoryBehaviorOptionsSchema = z
    .object({
      contextLimit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Number of previous messages to include from memory"),
      readOnly: z
        .boolean()
        .optional()
        .describe("When true, memory reads are allowed but no memory writes are persisted"),
      semanticMemory: SemanticMemoryOptionsSchema.optional().describe(
        "Semantic retrieval configuration for this call",
      ),
      conversationPersistence: ConversationPersistenceOptionsSchema.optional().describe(
        "Per-call conversation persistence behavior",
      ),
      messageMetadataPersistence: MessageMetadataPersistenceConfigSchema.optional().describe(
        "Per-call persisted assistant message metadata behavior",
      ),
    })
    .passthrough();

  const RuntimeMemoryEnvelopeSchema = z
    .object({
      conversationId: z.string().optional().describe("Conversation identifier for memory scoping"),
      userId: z.string().optional().describe("User identifier for memory scoping"),
      options: RuntimeMemoryBehaviorOptionsSchema.optional().describe(
        "Per-call memory behavior overrides",
      ),
    })
    .passthrough();

  // Generation options schema
  const GenerateOptionsSchema = z
    .object({
      memory: RuntimeMemoryEnvelopeSchema.optional().describe(
        "Runtime memory envelope (preferred): memory.userId/memory.conversationId + memory.options.*",
      ),
      userId: z.string().optional().describe("Deprecated: use options.memory.userId"),
      conversationId: z
        .string()
        .optional()
        .describe("Deprecated: use options.memory.conversationId"),
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
        .describe("Deprecated: use options.memory.options.contextLimit"),
      semanticMemory: SemanticMemoryOptionsSchema.optional().describe(
        "Deprecated: use options.memory.options.semanticMemory",
      ),
      conversationPersistence: ConversationPersistenceOptionsSchema.optional().describe(
        "Deprecated: use options.memory.options.conversationPersistence",
      ),
      messageMetadataPersistence: MessageMetadataPersistenceConfigSchema.optional().describe(
        "Deprecated: use options.memory.options.messageMetadataPersistence",
      ),
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
        .describe(
          "Provider-specific options for AI SDK providers (e.g., OpenAI's reasoningEffort)",
        ),
      resumableStream: z
        .boolean()
        .optional()
        .describe(
          "When true, avoids wiring the HTTP abort signal into streams so they can be resumed (requires resumable streams and conversation/user IDs via options.memory or top-level legacy fields). If omitted, server defaults may apply.",
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
  const TextRequestSchema = z.object({
    input: z
      .union([
        z.string().describe("Direct text input"),
        z.array(z.any()).describe("AI SDK message array (UIMessage or ModelMessage format)"),
      ])
      .describe("Input text or messages array - accepts string, UIMessage[], or ModelMessage[]"),
    options: GenerateOptionsSchema.optional().describe("Optional generation parameters"),
  });

  const TextResponseSchema = z.object({
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
              provided: z.boolean().optional(),
              providedAt: z.string().optional(),
              feedbackId: z.string().optional(),
            })
            .nullable()
            .optional()
            .describe("Feedback metadata for the trace"),
        })
        .describe("AI SDK formatted response"),
    ]),
  });

  // Stream schemas
  const StreamTextEventSchema = z.object({
    text: z.string().optional(),
    timestamp: z.string().datetime().optional(),
    type: z.enum(["text", "completion", "error"]).optional(),
    done: z.boolean().optional(),
    error: z.string().optional(),
  });

  // Object generation schemas
  const ObjectRequestSchema = z.object({
    input: z
      .union([
        z.string().describe("Direct text input"),
        z.array(z.any()).describe("AI SDK message array (UIMessage or ModelMessage format)"),
      ])
      .describe("Input text or messages array - accepts string, UIMessage[], or ModelMessage[]"),
    schema: BasicJsonSchema,
    options: GenerateOptionsSchema.optional().describe("Optional object generation parameters"),
  });

  const ObjectResponseSchema = z.object({
    success: z.literal(true),
    data: z.object({}).passthrough().describe("Generated object response"),
  });

  const StreamObjectEventSchema = z.any().describe("Streamed object parts or the final object");

  // Workflow schemas
  const WorkflowResponseSchema = z.object({
    id: z.string().describe("Unique workflow identifier"),
    name: z.string().describe("Human-readable workflow name"),
    purpose: z.string().describe("Description of what the workflow does"),
    stepsCount: z.number().int().describe("Number of steps in the workflow"),
    status: z
      .enum(["idle", "running", "completed", "error"])
      .describe("Current status of the workflow"),
  });

  const WorkflowListSchema = z
    .array(WorkflowResponseSchema)
    .describe("Array of workflow objects with their configurations");

  const WorkflowExecutionRequestSchema = z.object({
    input: z.any().describe("Input data for the workflow"),
    options: z
      .object({
        userId: z.string().optional(),
        conversationId: z.string().optional(),
        executionId: z.string().optional(),
        context: z.any().optional(),
        workflowState: z.record(z.string(), z.any()).optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      })
      .optional()
      .describe("Optional execution options"),
  });

  const WorkflowExecutionResponseSchema = z.object({
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

  const WorkflowStreamEventSchema = z.object({
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

  const WorkflowSuspendRequestSchema = z.object({
    reason: z.string().optional().describe("Reason for suspension"),
  });

  const WorkflowSuspendResponseSchema = z.object({
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

  const WorkflowCancelRequestSchema = z.object({
    reason: z.string().optional().describe("Reason for cancellation"),
  });

  const WorkflowCancelResponseSchema = z.object({
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

  const WorkflowResumeRequestSchema = z
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
            .describe(
              "Optional step ID to resume from a specific step instead of the suspended one",
            ),
        })
        .optional()
        .describe("Optional resume options"),
    })
    .optional();

  const WorkflowResumeResponseSchema = z.object({
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

  const WorkflowReplayRequestSchema = z.object({
    stepId: z.string().min(1).describe("Step ID to replay from"),
    inputData: z.any().optional().describe("Optional input override for the selected step"),
    resumeData: z.any().optional().describe("Optional resume payload override"),
    workflowStateOverride: z
      .record(z.string(), z.any())
      .optional()
      .describe("Optional workflow state override for replay run"),
  });

  const WorkflowReplayResponseSchema = z.object({
    success: z.literal(true),
    data: z
      .object({
        executionId: z.string(),
        startAt: z.string(),
        endAt: z.string().optional(),
        status: z.string(),
        result: z.any(),
      })
      .describe("Workflow replay result"),
  });

  return {
    ParamsSchema,
    AgentParamsSchema,
    WorkflowParamsSchema,
    WorkflowExecutionParamsSchema,
    ErrorSchema,
    SubAgentResponseSchema,
    AgentResponseSchema,
    AgentListSchema,
    WorkspaceInfoSchema,
    WorkspaceFileInfoSchema,
    WorkspaceFileListSchema,
    WorkspaceReadFileSchema,
    WorkspaceSkillMetadataSchema,
    WorkspaceSkillListItemSchema,
    WorkspaceSkillListSchema,
    WorkspaceSkillSchema,
    BasicJsonSchema,
    GenerateOptionsSchema,
    TextRequestSchema,
    TextResponseSchema,
    StreamTextEventSchema,
    ObjectRequestSchema,
    ObjectResponseSchema,
    StreamObjectEventSchema,
    WorkflowResponseSchema,
    WorkflowListSchema,
    WorkflowExecutionRequestSchema,
    WorkflowExecutionResponseSchema,
    WorkflowStreamEventSchema,
    WorkflowSuspendRequestSchema,
    WorkflowSuspendResponseSchema,
    WorkflowCancelRequestSchema,
    WorkflowCancelResponseSchema,
    WorkflowResumeRequestSchema,
    WorkflowResumeResponseSchema,
    WorkflowReplayRequestSchema,
    WorkflowReplayResponseSchema,
  };
}

export const {
  ParamsSchema,
  AgentParamsSchema,
  WorkflowParamsSchema,
  WorkflowExecutionParamsSchema,
  ErrorSchema,
  SubAgentResponseSchema,
  AgentResponseSchema,
  AgentListSchema,
  WorkspaceInfoSchema,
  WorkspaceFileInfoSchema,
  WorkspaceFileListSchema,
  WorkspaceReadFileSchema,
  WorkspaceSkillMetadataSchema,
  WorkspaceSkillListItemSchema,
  WorkspaceSkillListSchema,
  WorkspaceSkillSchema,
  BasicJsonSchema,
  GenerateOptionsSchema,
  TextRequestSchema,
  TextResponseSchema,
  StreamTextEventSchema,
  ObjectRequestSchema,
  ObjectResponseSchema,
  StreamObjectEventSchema,
  WorkflowResponseSchema,
  WorkflowListSchema,
  WorkflowExecutionRequestSchema,
  WorkflowExecutionResponseSchema,
  WorkflowStreamEventSchema,
  WorkflowSuspendRequestSchema,
  WorkflowSuspendResponseSchema,
  WorkflowCancelRequestSchema,
  WorkflowCancelResponseSchema,
  WorkflowResumeRequestSchema,
  WorkflowResumeResponseSchema,
  WorkflowReplayRequestSchema,
  WorkflowReplayResponseSchema,
} = createServerCoreSchemas();

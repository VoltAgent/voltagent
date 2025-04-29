import { z } from "zod";
import { createRoute } from "@hono/zod-openapi";
import type { AgentStatus } from "../agent/types"; // Import AgentStatus if needed for schemas

// --- Schemas ---

// Common Parameter Schema
export const ParamsSchema = z.object({
  id: z.string().openapi({
    param: { name: "id", in: "path" },
    description: "The ID of the agent",
    example: "my-agent-123",
  }),
});

// Common Error Response Schema
export const ErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().openapi({ description: "Error message" }),
});

// SubAgent Response Schema (simplified)
export const SubAgentResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    status: z.string().openapi({ description: "Current status of the sub-agent" }), // Keeping string for now
    model: z.string(),
    tools: z.array(z.any()).optional(),
    memory: z.any().optional(),
  })
  .passthrough();

// Agent Response Schema (updated to use SubAgentResponseSchema)
export const AgentResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    status: z.string().openapi({ description: "Current status of the agent" }), // Reverted to z.string()
    model: z.string(),
    tools: z.array(z.any()), // Simplified tool representation
    subAgents: z
      .array(SubAgentResponseSchema)
      .optional()
      .openapi({ description: "List of sub-agents" }), // Use SubAgent schema
    memory: z.any().optional(), // Simplified memory representation
    // Add other fields from getFullState if necessary and want them documented
  })
  .passthrough();

// Schema for common generation options passed in the request body
export const GenerateOptionsSchema = z
  .object({
    userId: z.string().optional().openapi({ description: "Optional user ID for context tracking" }),
    conversationId: z
      .string()
      .optional()
      .openapi({ description: "Optional conversation ID for context tracking" }),
    contextLimit: z
      .number()
      .int()
      .positive()
      .optional()
      .default(10)
      .openapi({ description: "Optional limit for conversation history context" }),
    temperature: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .default(0.7)
      .openapi({ description: "Controls randomness (0-1)" }),
    maxTokens: z
      .number()
      .int()
      .positive()
      .optional()
      .default(1024)
      .openapi({ description: "Maximum tokens to generate" }),
    topP: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .default(1.0)
      .openapi({ description: "Controls diversity via nucleus sampling (0-1)" }),
    frequencyPenalty: z
      .number()
      .min(0)
      .max(2)
      .optional()
      .default(0.0)
      .openapi({ description: "Penalizes repeated tokens (0-2)" }),
    presencePenalty: z
      .number()
      .min(0)
      .max(2)
      .optional()
      .default(0.0)
      .openapi({ description: "Penalizes tokens based on presence (0-2)" }),
    seed: z
      .number()
      .int()
      .optional()
      .openapi({ description: "Optional seed for reproducible results" }),
    stopSequences: z
      .array(z.string())
      .optional()
      .openapi({ description: "Stop sequences to end generation" }),
    extraOptions: z
      .record(z.string(), z.unknown())
      .optional()
      .openapi({ description: "Provider-specific options" }),
    // Add other relevant options from PublicGenerateOptions if known/needed for API exposure
  })
  .passthrough(); // Allow other provider-specific options not explicitly defined here

// Text Generation Schemas
export const TextRequestSchema = z.object({
  input: z
    .string()
    .openapi({ description: "Input text for the agent", example: "Tell me a joke!" }),
  options: GenerateOptionsSchema.optional().openapi({
    description: "Optional generation parameters",
  }), // Use GenerateOptionsSchema
});

export const TextResponseSchema = z.object({
  success: z.literal(true),
  data: z.string().openapi({ description: "Generated text response" }), // Assuming simple text response for now
});

// Stream Text Schemas (Representing SSE content)
export const StreamTextEventSchema = z.object({
  text: z.string().optional(),
  timestamp: z.string().datetime().optional(),
  type: z.enum(["text", "completion", "error"]).optional(),
  done: z.boolean().optional(),
  error: z.string().optional(),
});

// Object Generation Schemas
export const ObjectRequestSchema = z.object({
  input: z
    .string()
    .openapi({ description: "Input text for the agent", example: "Tell me a joke!" }),
  schema: z
    .object({})
    .passthrough()
    .openapi({
      description: "JSON schema describing the desired output object structure.",
      example: {
        type: "object",
        properties: {
          joke_setup: {
            type: "string",
            description: "The setup part of the joke",
          },
          punchline: {
            type: "string",
            description: "The punchline of the joke",
          },
          rating: {
            type: "number",
            description: "A rating of how funny the joke is from 1 to 5",
          },
        },
        required: ["joke_setup", "punchline"],
      },
    }), // Expect a JSON Schema object
  options: GenerateOptionsSchema.optional().openapi({
    description: "Optional generation parameters",
  }), // Use GenerateOptionsSchema
});

export const ObjectResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({}).passthrough().openapi({ description: "Generated object response" }), // Using passthrough object
});

// Stream Object Schemas (Representing SSE content)
// Assuming the stream delivers partial objects or final object based on implementation
export const StreamObjectEventSchema = z.any().openapi({
  description: "Streamed object parts or the final object, format depends on agent implementation.",
});

// --- Route Definitions ---

// Get all agents route
export const getAgentsRoute = createRoute({
  method: "get",
  path: "/agents",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z
              .array(AgentResponseSchema)
              .openapi({ description: "List of registered agents" }),
          }),
        },
      },
      description: "List of all registered agents",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Failed to retrieve agents",
    },
  },
  tags: ["Agent Management"],
});

// Generate text response
export const textRoute = createRoute({
  method: "post",
  path: "/agents/{id}/text",
  request: {
    params: ParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: TextRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: TextResponseSchema,
        },
      },
      description: "Successful text generation",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Agent not found",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Failed to generate text",
    },
  },
  tags: ["Agent Generation"], // Add tags for grouping in Swagger UI
});

// Stream text response
export const streamRoute = createRoute({
  method: "post",
  path: "/agents/{id}/stream",
  request: {
    params: ParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: TextRequestSchema, // Reusing TextRequestSchema
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        // SSE streams are tricky in OpenAPI. Describe the format.
        "text/event-stream": {
          schema: StreamTextEventSchema, // Schema for the *content* of an event
        },
      },
      description: `Server-Sent Events stream. Each event is formatted as:\n\
'data: {"text":"...", "timestamp":"...", "type":"text"}\n\n'\n
or\n\
'data: {"done":true, "timestamp":"...", "type":"completion"}\n\n'\n
or\n\
'data: {"error":"...", "timestamp":"...", "type":"error"}\n\n'`,
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Agent not found",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Failed to stream text",
    },
  },
  tags: ["Agent Generation"],
});

// Generate object response
export const objectRoute = createRoute({
  method: "post",
  path: "/agents/{id}/object",
  request: {
    params: ParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: ObjectRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ObjectResponseSchema,
        },
      },
      description: "Successful object generation",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Agent not found",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Failed to generate object",
    },
  },
  tags: ["Agent Generation"],
});

// Stream object response
export const streamObjectRoute = createRoute({
  method: "post",
  path: "/agents/{id}/stream-object",
  request: {
    params: ParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: ObjectRequestSchema, // Reuse ObjectRequestSchema
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        // Describe SSE format for object streaming
        "text/event-stream": {
          schema: StreamObjectEventSchema, // Schema for the *content* of an event
        },
      },
      description: `Server-Sent Events stream for object generation.\n\
Events might contain partial object updates or the final object.\n\
The exact format (e.g., JSON patches, partial objects) depends on the agent's implementation.\n\
Example event: 'data: {"partialUpdate": {...}}\n\n' or 'data: {"finalObject": {...}}\n\n'`,
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Agent not found",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Failed to stream object",
    },
  },
  tags: ["Agent Generation"],
});

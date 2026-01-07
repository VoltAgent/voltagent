import { ClientHTTPError, type ServerProviderDeps } from "@voltagent/core";
import { convertUsage } from "@voltagent/core";
import { type Logger, safeStringify } from "@voltagent/internal";
import { type UIMessage, UI_MESSAGE_STREAM_HEADERS, generateId } from "ai";
import { z } from "zod";
import { convertJsonSchemaToZod } from "zod-from-json-schema";
import { convertJsonSchemaToZod as convertJsonSchemaToZodV3 } from "zod-from-json-schema-v3";
import type { ApiResponse } from "../types";
import { processAgentOptions } from "../utils/options";

/**
 * Handler for listing all agents
 * Returns agent data array
 */
export async function handleGetAgents(
  deps: ServerProviderDeps,
  logger: Logger,
): Promise<ApiResponse> {
  try {
    const agents = deps.agentRegistry.getAllAgents();

    const agentDataArray = agents.map((agent) => {
      const fullState = agent.getFullState();
      const isTelemetryEnabled = agent.isTelemetryConfigured();
      return {
        id: fullState.id,
        name: fullState.name,
        description: fullState.instructions,
        status: fullState.status,
        model: fullState.model,
        tools: fullState.tools,
        subAgents: fullState.subAgents?.map((subAgent) => ({
          id: subAgent.id,
          name: subAgent.name,
          description: subAgent.instructions,
          status: subAgent.status,
          model: subAgent.model,
          tools: subAgent.tools,
          memory: subAgent.memory,
        })),
        memory: fullState.memory,
        isTelemetryEnabled,
      };
    });

    return {
      success: true,
      data: agentDataArray,
    };
  } catch (error) {
    logger.error("Failed to get agents", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handler for generating text
 * Returns generated text data
 */
export async function handleGenerateText(
  agentId: string,
  body: any,
  deps: ServerProviderDeps,
  logger: Logger,
  signal?: AbortSignal,
): Promise<ApiResponse> {
  try {
    const agent = deps.agentRegistry.getAgent(agentId);
    if (!agent) {
      return {
        success: false,
        error: `Agent ${agentId} not found`,
      };
    }

    const { input } = body;
    const options = processAgentOptions(body, signal);

    const result = await agent.generateText(input, options);

    // Convert usage format if present
    const usage = result.usage ? convertUsage(result.usage) : undefined;

    return {
      success: true,
      data: {
        text: result.text,
        usage,
        finishReason: result.finishReason,
        toolCalls: result.toolCalls,
        toolResults: result.toolResults,
        // Try to access output safely - getter throws if not defined
        ...(() => {
          try {
            return result.output ? { output: result.output } : {};
          } catch {
            return {};
          }
        })(),
      },
    };
  } catch (error) {
    logger.error("Failed to generate text", { error });
    if (error instanceof ClientHTTPError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        name: error.name,
        httpStatus: error.httpStatus,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handler for streaming text generation with raw fullStream
 * Returns raw stream data via SSE
 */
export async function handleStreamText(
  agentId: string,
  body: any,
  deps: ServerProviderDeps,
  logger: Logger,
  signal?: AbortSignal,
): Promise<Response> {
  try {
    const agent = deps.agentRegistry.getAgent(agentId);
    if (!agent) {
      return new Response(
        safeStringify({
          error: `Agent ${agentId} not found`,
          message: `Agent ${agentId} not found`,
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    const { input } = body;
    const options = processAgentOptions(body, signal);

    const result = await agent.streamText(input, options);

    // Access the fullStream property
    const { fullStream } = result;

    // Convert fullStream to SSE format
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const part of fullStream) {
            // Send each part as a JSON-encoded SSE event
            const data = `data: ${safeStringify(part)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        } catch (error) {
          logger.error("Error in fullStream iteration", { error });
          // Send error event
          const errorData = `data: ${safeStringify({ type: "error", error: error instanceof Error ? error.message : "Unknown error" })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    logger.error("Failed to handle stream text request", { error });

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      safeStringify({
        error: errorMessage,
        message: errorMessage,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}

/**
 * Handler for streaming chat messages
 * Returns AI SDK UI Message Stream Response
 */
export async function handleChatStream(
  agentId: string,
  body: any,
  deps: ServerProviderDeps,
  logger: Logger,
  signal?: AbortSignal,
): Promise<Response> {
  try {
    const agent = deps.agentRegistry.getAgent(agentId);
    if (!agent) {
      return new Response(
        safeStringify({
          error: `Agent ${agentId} not found`,
          message: `Agent ${agentId} not found`,
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    const { input } = body;
    const originalMessages =
      Array.isArray(input) &&
      input.length > 0 &&
      input.every((message) => Array.isArray((message as { parts?: unknown }).parts))
        ? (input as UIMessage[])
        : undefined;
    let resumableStreamRequested =
      typeof body?.options?.resumableStream === "boolean"
        ? body.options.resumableStream
        : (deps.resumableStreamDefault ?? false);
    const options = processAgentOptions(body, signal);
    const conversationId =
      typeof options.conversationId === "string" ? options.conversationId : undefined;
    const userId =
      typeof options.userId === "string" && options.userId.trim().length > 0
        ? options.userId
        : undefined;
    const resumableEnabled = Boolean(deps.resumableStream);
    const resumableStreamEnabled =
      resumableEnabled &&
      resumableStreamRequested === true &&
      Boolean(conversationId) &&
      Boolean(userId);

    if (resumableStreamRequested === true && !resumableEnabled) {
      logger.warn(
        "Resumable streams requested but not configured. Falling back to non-resumable streams.",
        {
          docsUrl: "https://voltagent.dev/docs/agents/resumable-streaming/",
        },
      );
      resumableStreamRequested = false;
    }

    if (resumableStreamRequested === true && !conversationId) {
      return new Response(
        safeStringify({
          error: "conversationId is required for resumable streams",
          message: "conversationId is required for resumable streams",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (resumableStreamRequested === true && !userId) {
      return new Response(
        safeStringify({
          error: "userId is required for resumable streams",
          message: "userId is required for resumable streams",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (resumableStreamEnabled) {
      options.abortSignal = undefined;
    }

    options.resumableStream = resumableStreamEnabled;

    const resumableStreamAdapter = deps.resumableStream;
    if (resumableStreamEnabled && resumableStreamAdapter && conversationId && userId) {
      try {
        await resumableStreamAdapter.clearActiveStream({ conversationId, agentId, userId });
      } catch (error) {
        logger.warn("Failed to clear active resumable stream", { error });
      }
    }

    const result = await agent.streamText(input, options);
    let activeStreamId: string | null = null;

    // Use the built-in toUIMessageStreamResponse - it handles errors properly
    return result.toUIMessageStreamResponse({
      originalMessages,
      generateMessageId: generateId,
      sendReasoning: true,
      sendSources: true,
      consumeSseStream: async ({ stream }) => {
        if (!resumableStreamEnabled || !resumableStreamAdapter || !conversationId || !userId) {
          return;
        }

        try {
          activeStreamId = await resumableStreamAdapter.createStream({
            conversationId,
            agentId,
            userId,
            stream,
          });
        } catch (error) {
          logger.error("Failed to persist resumable chat stream", { error });
        }
      },
      onFinish: async () => {
        if (!resumableStreamEnabled || !resumableStreamAdapter || !conversationId || !userId) {
          return;
        }

        try {
          await resumableStreamAdapter.clearActiveStream({
            conversationId,
            agentId,
            userId,
            streamId: activeStreamId ?? undefined,
          });
        } catch (error) {
          logger.error("Failed to clear resumable chat stream", { error });
        }
      },
    });
  } catch (error) {
    logger.error("Failed to handle chat stream request", { error });

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      safeStringify({
        error: errorMessage,
        message: errorMessage,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}

/**
 * Handler for resuming chat streams
 * Returns SSE stream if active, or 204 if no stream is active
 */
export async function handleResumeChatStream(
  agentId: string,
  conversationId: string,
  deps: ServerProviderDeps,
  logger: Logger,
  userId?: string,
): Promise<Response> {
  try {
    if (!deps.resumableStream) {
      return new Response(null, { status: 204 });
    }

    if (!userId) {
      return new Response(
        safeStringify({
          error: "userId is required for resumable streams",
          message: "userId is required for resumable streams",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    const streamId = await deps.resumableStream.getActiveStreamId({
      conversationId,
      agentId,
      userId,
    });

    if (!streamId) {
      return new Response(null, { status: 204 });
    }

    const stream = await deps.resumableStream.resumeStream(streamId);
    if (!stream) {
      try {
        await deps.resumableStream.clearActiveStream({
          conversationId,
          agentId,
          userId,
          streamId,
        });
      } catch (error) {
        logger.warn("Failed to clear inactive resumable stream", { error });
      }
      return new Response(null, { status: 204 });
    }

    const encodedStream = stream.pipeThrough(new TextEncoderStream());

    return new Response(encodedStream, {
      status: 200,
      headers: UI_MESSAGE_STREAM_HEADERS,
    });
  } catch (error) {
    logger.error("Failed to resume chat stream", { error });
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      safeStringify({
        error: errorMessage,
        message: errorMessage,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}

/**
 * Handler for generating objects
 * Returns generated object data
 */
export async function handleGenerateObject(
  agentId: string,
  body: any,
  deps: ServerProviderDeps,
  logger: Logger,
  signal?: AbortSignal,
): Promise<ApiResponse> {
  try {
    const agent = deps.agentRegistry.getAgent(agentId);
    if (!agent) {
      return {
        success: false,
        error: `Agent ${agentId} not found`,
      };
    }

    const { input, schema: jsonSchema } = body;
    const options = processAgentOptions(body, signal);

    // Convert JSON schema to Zod schema (supports zod v3 and v4)
    const zodSchema = ("toJSONSchema" in z ? convertJsonSchemaToZod : convertJsonSchemaToZodV3)(
      jsonSchema,
    ) as any;

    const result = await agent.generateObject(input, zodSchema, options);

    return {
      success: true,
      data: result.object,
    };
  } catch (error) {
    logger.error("Failed to generate object", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handler for streaming object generation
 * Returns AI SDK Response or error
 */
export async function handleStreamObject(
  agentId: string,
  body: any,
  deps: ServerProviderDeps,
  logger: Logger,
  signal?: AbortSignal,
): Promise<Response> {
  try {
    const agent = deps.agentRegistry.getAgent(agentId);
    if (!agent) {
      return new Response(
        safeStringify({
          error: `Agent ${agentId} not found`,
          message: `Agent ${agentId} not found`,
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    const { input, schema: jsonSchema } = body;
    const options = processAgentOptions(body, signal);

    // Convert JSON schema to Zod schema (supports zod v3 and v4)
    const zodSchema = ("toJSONSchema" in z ? convertJsonSchemaToZod : convertJsonSchemaToZodV3)(
      jsonSchema,
    ) as any;

    const result = await agent.streamObject(input, zodSchema, options);

    // Use the built-in toTextStreamResponse - it handles errors properly
    return result.toTextStreamResponse();
  } catch (error) {
    logger.error("Failed to handle stream object request", { error });

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      safeStringify({
        error: errorMessage,
        message: errorMessage,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}

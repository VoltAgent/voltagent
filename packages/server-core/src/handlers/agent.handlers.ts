import { ClientHTTPError, type ServerProviderDeps } from "@voltagent/core";
import { convertUsage } from "@voltagent/core";
import { type Logger, safeStringify } from "@voltagent/internal";
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
    const options = processAgentOptions(body, signal);

    const result = await agent.streamText(input, options);

    // Use the built-in toUIMessageStreamResponse - it handles errors properly
    return result.toUIMessageStreamResponse({
      sendReasoning: true,
      sendSources: true,
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

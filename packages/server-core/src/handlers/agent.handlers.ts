import type { ServerProviderDeps } from "@voltagent/core";
import { convertUsage } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import { convertJsonSchemaToZod } from "zod-from-json-schema";
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
    const options = processAgentOptions(body);

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
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handler for streaming text generation
 * Returns AI SDK Response or error
 */
export async function handleStreamText(
  agentId: string,
  body: any,
  deps: ServerProviderDeps,
  logger: Logger,
): Promise<Response> {
  try {
    const agent = deps.agentRegistry.getAgent(agentId);
    if (!agent) {
      return new Response(
        JSON.stringify({
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
    const options = processAgentOptions(body);

    const result = await agent.streamText(input, options);

    // Use the built-in toUIMessageStreamResponse - it handles errors properly
    return result.toUIMessageStreamResponse();
  } catch (error) {
    logger.error("Failed to handle stream text request", { error });

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({
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
    const options = processAgentOptions(body);

    // Convert JSON schema to Zod schema
    const zodSchema = convertJsonSchemaToZod(jsonSchema);

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
): Promise<Response> {
  try {
    const agent = deps.agentRegistry.getAgent(agentId);
    if (!agent) {
      return new Response(
        JSON.stringify({
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
    const options = processAgentOptions(body);

    // Convert JSON schema to Zod schema
    const zodSchema = convertJsonSchemaToZod(jsonSchema);

    const result = await agent.streamObject(input, zodSchema, options);

    // Use the built-in toTextStreamResponse - it handles errors properly
    return result.toTextStreamResponse();
  } catch (error) {
    logger.error("Failed to handle stream object request", { error });

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({
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

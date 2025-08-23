import type { ServerProviderDeps } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import type { ApiResponse } from "../types";

/**
 * Handler for getting a single agent by ID
 * Returns agent data
 */
export async function handleGetAgent(
  agentId: string,
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

    const agentState = agent.getFullState();
    const isTelemetryEnabled = agent.isTelemetryConfigured();

    return {
      success: true,
      data: {
        ...agentState,
        status: agentState.status,
        tools: agent.getToolsForApi ? agent.getToolsForApi() : agentState.tools,
        subAgents: agentState.subAgents,
        isTelemetryEnabled,
      },
    };
  } catch (error) {
    logger.error("Failed to get agent", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handler for getting agent history
 * Returns agent history data
 */
export async function handleGetAgentHistory(
  agentId: string,
  page: number,
  limit: number,
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

    // Check if agent supports history
    if (!("getHistory" in agent) || typeof agent.getHistory !== "function") {
      return {
        success: false,
        error: "Agent does not support history",
      };
    }

    // Validate pagination parameters
    if (page < 0 || limit < 1 || limit > 100) {
      return {
        success: false,
        error: "Invalid pagination parameters. Page must be >= 0, limit must be between 1 and 100",
      };
    }

    // Get history from agent
    const historyResult = await agent.getHistory({ page, limit });

    return {
      success: true,
      data: historyResult,
    };
  } catch (error) {
    logger.error("Failed to get history for agent", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get agent history",
    };
  }
}

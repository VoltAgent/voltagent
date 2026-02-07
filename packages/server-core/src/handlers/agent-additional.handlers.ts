import type { ServerProviderDeps, Workspace, WorkspaceSkillMetadata } from "@voltagent/core";
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

const parseOptionalInteger = (value: unknown): number | null | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseOptionalBoolean = (value: unknown): boolean | null | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value).toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
};

const resolveAgentWorkspace = (
  agentId: string,
  deps: ServerProviderDeps,
): {
  agent: ReturnType<ServerProviderDeps["agentRegistry"]["getAgent"]>;
  workspace: Workspace | null;
} | null => {
  const agent = deps.agentRegistry.getAgent(agentId);
  if (!agent) {
    return null;
  }
  const workspace = agent.getWorkspace?.();
  if (!workspace) {
    return { agent, workspace: null };
  }
  return { agent, workspace };
};

/**
 * Handler for getting agent workspace info
 */
export async function handleGetAgentWorkspaceInfo(
  agentId: string,
  deps: ServerProviderDeps,
  logger: Logger,
): Promise<ApiResponse> {
  try {
    const resolved = resolveAgentWorkspace(agentId, deps);
    if (!resolved) {
      return {
        success: false,
        error: `Agent ${agentId} not found`,
        httpStatus: 404,
      };
    }

    if (!resolved.workspace) {
      return {
        success: false,
        error: "Workspace not configured for this agent",
        httpStatus: 404,
      };
    }

    const workspace = resolved.workspace;

    return {
      success: true,
      data: {
        id: workspace.id,
        name: workspace.name,
        scope: workspace.scope,
        capabilities: {
          filesystem: true,
          sandbox: Boolean(workspace.sandbox),
          search: Boolean(workspace.getInfo().search),
          skills: Boolean(workspace.skills),
        },
      },
    };
  } catch (error) {
    logger.error("Failed to get workspace info", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get workspace info",
      httpStatus: 500,
    };
  }
}

/**
 * Handler for listing workspace files
 */
export async function handleListAgentWorkspaceFiles(
  agentId: string,
  options: { path?: string },
  deps: ServerProviderDeps,
  logger: Logger,
): Promise<ApiResponse> {
  try {
    const resolved = resolveAgentWorkspace(agentId, deps);
    if (!resolved) {
      return {
        success: false,
        error: `Agent ${agentId} not found`,
        httpStatus: 404,
      };
    }
    if (!resolved.workspace) {
      return {
        success: false,
        error: "Workspace not configured for this agent",
        httpStatus: 404,
      };
    }

    const path = options.path && options.path.trim().length > 0 ? options.path : "/";
    const entries = await resolved.workspace.filesystem.lsInfo(path);

    return {
      success: true,
      data: {
        path,
        entries,
      },
    };
  } catch (error) {
    logger.error("Failed to list workspace files", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list workspace files",
      httpStatus: 500,
    };
  }
}

/**
 * Handler for reading a workspace file
 */
export async function handleReadAgentWorkspaceFile(
  agentId: string,
  options: { path?: string; offset?: unknown; limit?: unknown },
  deps: ServerProviderDeps,
  logger: Logger,
): Promise<ApiResponse> {
  try {
    const resolved = resolveAgentWorkspace(agentId, deps);
    if (!resolved) {
      return {
        success: false,
        error: `Agent ${agentId} not found`,
        httpStatus: 404,
      };
    }
    if (!resolved.workspace) {
      return {
        success: false,
        error: "Workspace not configured for this agent",
        httpStatus: 404,
      };
    }

    const path = options.path?.trim();
    if (!path) {
      return {
        success: false,
        error: "Missing required path parameter",
        httpStatus: 400,
      };
    }

    const offset = parseOptionalInteger(options.offset);
    if (offset === null) {
      return {
        success: false,
        error: "Invalid offset parameter",
        httpStatus: 400,
      };
    }
    const limit = parseOptionalInteger(options.limit);
    if (limit === null) {
      return {
        success: false,
        error: "Invalid limit parameter",
        httpStatus: 400,
      };
    }
    if (offset !== undefined && offset < 0) {
      return {
        success: false,
        error: "Offset must be >= 0",
        httpStatus: 400,
      };
    }
    if (limit !== undefined && limit < 1) {
      return {
        success: false,
        error: "Limit must be >= 1",
        httpStatus: 400,
      };
    }

    const content = await resolved.workspace.filesystem.read(path, {
      offset: offset ?? 0,
      limit: limit ?? 2000,
    });

    return {
      success: true,
      data: {
        path,
        content,
      },
    };
  } catch (error) {
    logger.error("Failed to read workspace file", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to read workspace file",
      httpStatus: 500,
    };
  }
}

/**
 * Handler for listing workspace skills
 */
export async function handleListAgentWorkspaceSkills(
  agentId: string,
  options: { refresh?: unknown },
  deps: ServerProviderDeps,
  logger: Logger,
): Promise<ApiResponse> {
  try {
    const resolved = resolveAgentWorkspace(agentId, deps);
    if (!resolved) {
      return {
        success: false,
        error: `Agent ${agentId} not found`,
        httpStatus: 404,
      };
    }
    if (!resolved.workspace) {
      return {
        success: false,
        error: "Workspace not configured for this agent",
        httpStatus: 404,
      };
    }
    if (!resolved.workspace.skills) {
      return {
        success: false,
        error: "Workspace skills are not configured for this agent",
        httpStatus: 404,
      };
    }

    const refresh = parseOptionalBoolean(options.refresh);
    if (refresh === null) {
      return {
        success: false,
        error: "Invalid refresh parameter",
        httpStatus: 400,
      };
    }

    const skills: WorkspaceSkillMetadata[] = await resolved.workspace.skills.discoverSkills({
      refresh: Boolean(refresh),
    });
    const activeIds = new Set(
      resolved.workspace.skills.getActiveSkills().map((skill: WorkspaceSkillMetadata) => skill.id),
    );
    const list = skills.map((skill) => ({
      ...skill,
      active: activeIds.has(skill.id),
    }));

    return {
      success: true,
      data: {
        skills: list,
      },
    };
  } catch (error) {
    logger.error("Failed to list workspace skills", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list workspace skills",
      httpStatus: 500,
    };
  }
}

/**
 * Handler for reading a workspace skill
 */
export async function handleGetAgentWorkspaceSkill(
  agentId: string,
  skillId: string,
  deps: ServerProviderDeps,
  logger: Logger,
): Promise<ApiResponse> {
  try {
    const resolved = resolveAgentWorkspace(agentId, deps);
    if (!resolved) {
      return {
        success: false,
        error: `Agent ${agentId} not found`,
        httpStatus: 404,
      };
    }
    if (!resolved.workspace) {
      return {
        success: false,
        error: "Workspace not configured for this agent",
        httpStatus: 404,
      };
    }
    if (!resolved.workspace.skills) {
      return {
        success: false,
        error: "Workspace skills are not configured for this agent",
        httpStatus: 404,
      };
    }
    if (!skillId || skillId.trim().length === 0) {
      return {
        success: false,
        error: "Missing skillId parameter",
        httpStatus: 400,
      };
    }

    const skill = await resolved.workspace.skills.loadSkill(skillId);
    if (!skill) {
      return {
        success: false,
        error: `Skill ${skillId} not found`,
        httpStatus: 404,
      };
    }

    return {
      success: true,
      data: skill,
    };
  } catch (error) {
    logger.error("Failed to get workspace skill", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get workspace skill",
      httpStatus: 500,
    };
  }
}

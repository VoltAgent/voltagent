import type { MCPServerRegistry } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import type {
  CallToolResult,
  FilterContext,
  GetPromptRequest,
  GetPromptResult,
  MCPListedTool,
  MCPServerMetadata,
  Prompt,
  Resource,
  ResourceContents,
  ResourceTemplate,
} from "./types";

import type { ApiResponse } from "../types";
import { listMcpServers, lookupMcpServer } from "./registry";

export interface McpServerListResponse {
  servers: MCPServerMetadata[];
}

export interface McpServerDetailResponse extends MCPServerMetadata {}

export interface McpToolListResponse {
  server: MCPServerMetadata;
  tools: MCPListedTool[];
}

export interface McpInvokeToolRequest {
  arguments?: unknown;
  context?: Partial<Omit<FilterContext, "transport">>;
}

export type McpInvokeToolResponse = CallToolResult;

export interface McpSetLogLevelRequest {
  level: string;
}

export type McpSetLogLevelResponse = { success: true };

export interface McpPromptListResponse {
  prompts: Prompt[];
}

export type McpPromptDetailResponse = GetPromptResult;

export interface McpResourceListResponse {
  resources: Resource[];
}

export type McpResourceDetailResponse = ResourceContents | ResourceContents[];

export interface McpResourceTemplateListResponse {
  resourceTemplates: ResourceTemplate[];
}

export function handleListMcpServers(
  registry: MCPServerRegistry,
): ApiResponse<McpServerListResponse> {
  const servers = listMcpServers(registry);
  return {
    success: true,
    data: { servers },
  };
}

export function handleGetMcpServer(
  registry: MCPServerRegistry,
  serverId: string,
): ApiResponse<McpServerDetailResponse> {
  const { metadata } = lookupMcpServer(registry, serverId);
  if (!metadata) {
    return {
      success: false,
      error: `MCP server '${serverId}' not found`,
    };
  }

  return {
    success: true,
    data: metadata,
  };
}

export function handleListMcpServerTools(
  registry: MCPServerRegistry,
  logger: Logger,
  serverId: string,
): ApiResponse<McpToolListResponse> {
  const { server, metadata } = lookupMcpServer(registry, serverId);

  if (!server || typeof server.listTools !== "function" || !metadata) {
    return {
      success: false,
      error: `MCP server '${serverId}' not available`,
    };
  }

  try {
    const tools = server.listTools({});
    return {
      success: true,
      data: {
        server: metadata,
        tools,
      },
    };
  } catch (error) {
    logger.error("Failed to list MCP tools", { error, serverId });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function handleInvokeMcpServerTool(
  registry: MCPServerRegistry,
  logger: Logger,
  serverId: string,
  toolName: string,
  request: McpInvokeToolRequest,
): Promise<ApiResponse<McpInvokeToolResponse>> {
  const { server } = lookupMcpServer(registry, serverId);

  if (!server || typeof server.executeTool !== "function") {
    return {
      success: false,
      error: `MCP server '${serverId}' not available`,
    };
  }

  try {
    const contextOverrides =
      request.context && typeof request.context === "object" ? request.context : {};
    const result = await server.executeTool(toolName, request.arguments ?? {}, contextOverrides);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    logger.error("Failed to execute MCP tool", {
      error,
      serverId,
      toolName,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function handleSetMcpLogLevel(
  registry: MCPServerRegistry,
  logger: Logger,
  serverId: string,
  request: McpSetLogLevelRequest,
): Promise<ApiResponse<McpSetLogLevelResponse>> {
  const { server } = lookupMcpServer(registry, serverId);

  if (!server || typeof server.setLogLevel !== "function") {
    return {
      success: false,
      error: `MCP server '${serverId}' does not support log level updates`,
    };
  }

  try {
    await server.setLogLevel(request.level);
    return { success: true, data: { success: true } };
  } catch (error) {
    logger.error("Failed to set MCP logging level", { error, serverId });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function handleListMcpPrompts(
  registry: MCPServerRegistry,
  logger: Logger,
  serverId: string,
): Promise<ApiResponse<McpPromptListResponse>> {
  const { server } = lookupMcpServer(registry, serverId);

  if (!server || typeof server.listPrompts !== "function") {
    return {
      success: false,
      error: `MCP server '${serverId}' does not expose prompts`,
    };
  }

  try {
    const prompts = await server.listPrompts();
    return { success: true, data: { prompts } };
  } catch (error) {
    logger.error("Failed to list MCP prompts", { error, serverId });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function handleGetMcpPrompt(
  registry: MCPServerRegistry,
  logger: Logger,
  serverId: string,
  params: GetPromptRequest["params"],
): Promise<ApiResponse<McpPromptDetailResponse>> {
  const { server } = lookupMcpServer(registry, serverId);

  if (!server || typeof server.getPrompt !== "function") {
    return {
      success: false,
      error: `MCP server '${serverId}' does not expose prompts`,
    };
  }

  try {
    const prompt = await server.getPrompt(params);
    return { success: true, data: prompt };
  } catch (error) {
    logger.error("Failed to retrieve MCP prompt", { error, serverId, promptName: params.name });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function handleListMcpResources(
  registry: MCPServerRegistry,
  logger: Logger,
  serverId: string,
): Promise<ApiResponse<McpResourceListResponse>> {
  const { server } = lookupMcpServer(registry, serverId);

  if (!server || typeof server.listResources !== "function") {
    return {
      success: false,
      error: `MCP server '${serverId}' does not expose resources`,
    };
  }

  try {
    const resources = await server.listResources();
    return { success: true, data: { resources } };
  } catch (error) {
    logger.error("Failed to list MCP resources", { error, serverId });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function handleGetMcpResource(
  registry: MCPServerRegistry,
  logger: Logger,
  serverId: string,
  uri: string,
): Promise<ApiResponse<McpResourceDetailResponse>> {
  const { server } = lookupMcpServer(registry, serverId);

  if (!server || typeof server.readResource !== "function") {
    return {
      success: false,
      error: `MCP server '${serverId}' does not expose resources`,
    };
  }

  try {
    const contents = await server.readResource(uri);
    return { success: true, data: contents };
  } catch (error) {
    logger.error("Failed to load MCP resource", { error, serverId, uri });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function handleListMcpResourceTemplates(
  registry: MCPServerRegistry,
  logger: Logger,
  serverId: string,
): Promise<ApiResponse<McpResourceTemplateListResponse>> {
  const { server } = lookupMcpServer(registry, serverId);

  if (!server || typeof server.listResourceTemplates !== "function") {
    return {
      success: false,
      error: `MCP server '${serverId}' does not expose resource templates`,
    };
  }

  try {
    const resourceTemplates = await server.listResourceTemplates();
    return { success: true, data: { resourceTemplates } };
  } catch (error) {
    logger.error("Failed to list MCP resource templates", { error, serverId });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

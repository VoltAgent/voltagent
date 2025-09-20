import type {
  CallToolResult,
  GetPromptRequest,
  GetPromptResult,
  Tool as MCPToolDefinition,
  Prompt,
  Resource,
  ResourceContents,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/types.js";
import type {
  MCPServerLike as BaseMCPServerLike,
  MCPServerMetadata as BaseMCPServerMetadata,
  MCPServerDeps,
} from "@voltagent/internal/mcp";

export interface FilterContext {
  transport: "stdio" | "sse" | "http";
  sessionId?: string;
  userRole?: string;
  metadata?: Record<string, unknown>;
}

export interface MCPAgentMetadata {
  id: string;
  name: string;
  description?: string;
  purpose?: string;
  instructions?: string;
}

export interface MCPToolMetadata {
  id?: string;
  name: string;
  description?: string;
}

export interface MCPWorkflowSummary {
  id: string;
  name: string;
  purpose?: string;
  metadata?: Record<string, unknown>;
}

export interface MCPServerPackageInfo {
  name: string;
  version: string;
  description?: string;
  installCommand?: string[];
  homepage?: string;
}

export interface MCPServerRemoteInfo {
  environment: string;
  url: string;
  headers?: Record<string, string>;
  description?: string;
}

export interface ProtocolConfig {
  stdio?: boolean;
  sse?: boolean;
  http?: boolean;
  [key: string]: unknown;
}

export type ProtocolRecord = ProtocolConfig & Record<string, unknown>;

export interface MCPServerCapabilitiesConfig {
  logging?: boolean;
  prompts?: boolean;
  resources?: boolean;
  elicitation?: boolean;
  [key: string]: unknown;
}

export type CapabilityRecord = MCPServerCapabilitiesConfig & Record<string, unknown>;

export interface MCPServerMetadata extends BaseMCPServerMetadata {
  protocols?: ProtocolRecord;
  capabilities?: CapabilityRecord;
  agents?: MCPAgentMetadata[];
  workflows?: MCPWorkflowSummary[];
  tools?: MCPToolMetadata[];
  releaseDate?: string;
  packages?: MCPServerPackageInfo[];
  remotes?: MCPServerRemoteInfo[];
}

export type MCPToolOrigin = "tool" | "agent" | "workflow";

export interface MCPListedTool {
  name: string;
  type: MCPToolOrigin;
  definition: MCPToolDefinition;
}

export interface MCPServerLike extends BaseMCPServerLike {
  initialize(deps: MCPServerDeps): void;
  listTools?(contextOverrides?: Partial<Omit<FilterContext, "transport">>): MCPListedTool[];
  executeTool?(
    name: string,
    args: unknown,
    contextOverrides?: Partial<Omit<FilterContext, "transport">>,
  ): Promise<CallToolResult>;
  setLogLevel?(level: string): Promise<void> | void;
  listPrompts?(): Promise<Prompt[]>;
  getPrompt?(params: GetPromptRequest["params"]): Promise<GetPromptResult>;
  listResources?(): Promise<Resource[]>;
  readResource?(uri: string): Promise<ResourceContents | ResourceContents[]>;
  listResourceTemplates?(): Promise<ResourceTemplate[]>;
}

export type {
  CallToolResult,
  GetPromptRequest,
  GetPromptResult,
  Prompt,
  Resource,
  ResourceContents,
  ResourceTemplate,
};

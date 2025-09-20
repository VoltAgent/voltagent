import type * as http from "node:http";
import type { SSEServerTransportOptions } from "@modelcontextprotocol/sdk/server/sse.js";
import type { StreamableHTTPServerTransportOptions } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type {
  CallToolResult,
  ElicitRequest,
  ElicitResult,
  GetPromptRequest,
  GetPromptResult,
  Tool as MCPToolDefinition,
  Prompt,
  PromptMessage,
  Resource,
  ResourceContents,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/types.js";
import type { Agent, RegisteredWorkflow, Tool as VoltTool, Workflow } from "@voltagent/core";
import type {
  MCPServerDeps as BaseMCPServerDeps,
  MCPServerFactory as BaseMCPServerFactory,
  MCPServerLike as BaseMCPServerLike,
  MCPServerMetadata as BaseMCPServerMetadata,
} from "@voltagent/internal/mcp";
import type { FilterContext, FilterFunction, WorkflowSummary } from "./filters";
import type { SseBridge } from "./transports/external-sse";

export interface ProtocolConfig {
  stdio?: boolean;
  sse?: boolean;
  http?: boolean;
}

export interface MCPServerCapabilitiesConfig {
  logging?: boolean;
  prompts?: boolean;
  resources?: boolean;
  elicitation?: boolean;
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

export interface MCPStaticPromptConfig {
  name: string;
  description?: string;
  messages: PromptMessage[];
}

export interface MCPStaticResourceConfig {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
  text?: string;
  blobBase64?: string;
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

export type MCPWorkflowConfigEntry =
  | RegisteredWorkflow
  | Workflow<any, any, any, any>
  | { toWorkflow(): Workflow<any, any, any, any> };

export interface MCPLoggingAdapter {
  setLevel?(level: string): Promise<void> | void;
  getLevel?(): Promise<string | undefined> | string | undefined;
}

export interface MCPPromptsAdapter {
  listPrompts(): Promise<Prompt[]>;
  getPrompt(params: GetPromptRequest["params"]): Promise<GetPromptResult>;
}

export interface MCPResourceSubscribeParams {
  uri: string;
}

export interface MCPResourcesAdapter {
  listResources(): Promise<Resource[]>;
  readResource(uri: string): Promise<ResourceContents | ResourceContents[]>;
  listResourceTemplates?(): Promise<ResourceTemplate[]>;
  subscribe?(
    params: MCPResourceSubscribeParams,
    headers?: Record<string, string>,
  ): Promise<void> | void;
  unsubscribe?(params: MCPResourceSubscribeParams): Promise<void> | void;
}

export interface MCPElicitationAdapter {
  sendRequest(request: ElicitRequest["params"]): Promise<ElicitResult>;
}

export interface MCPServerConfig {
  id?: string;
  name: string;
  version: string;
  description?: string;
  protocols?: ProtocolConfig;
  filterTools?: FilterFunction<VoltTool<any, any>>;
  filterAgents?: FilterFunction<Agent>;
  filterWorkflows?: FilterFunction<WorkflowSummary>;
  capabilities?: MCPServerCapabilitiesConfig;
  agents?: Record<string, Agent>;
  workflows?: Record<string, MCPWorkflowConfigEntry>;
  tools?: Record<string, VoltTool<any, any>>;
  releaseDate?: string;
  packages?: MCPServerPackageInfo[];
  remotes?: MCPServerRemoteInfo[];
  adapters?: MCPServerDynamicAdapters;
}

export interface MCPServerDynamicAdapters {
  logging?: MCPLoggingAdapter;
  prompts?: MCPPromptsAdapter;
  resources?: MCPResourcesAdapter;
  elicitation?: MCPElicitationAdapter;
}

export type ProtocolRecord = ProtocolConfig & Record<string, unknown>;
export type CapabilityRecord = MCPServerCapabilitiesConfig & Record<string, unknown>;

export interface MCPServerMetadata
  extends Omit<BaseMCPServerMetadata, "protocols" | "capabilities" | "packages" | "remotes"> {
  protocols?: ProtocolRecord;
  capabilities?: CapabilityRecord;
  agents?: MCPAgentMetadata[];
  workflows?: WorkflowSummary[];
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

export interface MCPStreamableHTTPRequestOptions {
  url: URL;
  httpPath: string;
  req: http.IncomingMessage;
  res: http.ServerResponse<http.IncomingMessage>;
  transportOptions?: StreamableHTTPServerTransportOptions;
  contextOverrides?: Partial<Omit<FilterContext, "transport">>;
}

export interface MCPServerSSERequestOptions {
  url: URL;
  ssePath: string;
  messagePath: string;
  req: http.IncomingMessage;
  res: http.ServerResponse<http.IncomingMessage>;
  transportOptions?: SSEServerTransportOptions;
  contextOverrides?: Partial<Omit<FilterContext, "transport">>;
}

export interface MCPServerDeps extends BaseMCPServerDeps {
  agentRegistry: {
    getAllAgents(): Agent[];
    getAgent(id: string): Agent | undefined;
  };
  workflowRegistry: {
    getWorkflow(id: string): RegisteredWorkflow | undefined;
    getAllWorkflows(): RegisteredWorkflow[];
    getWorkflowsForApi(): unknown[];
    resumeSuspendedWorkflow(
      workflowId: string,
      executionId: string,
      resumeData?: unknown,
      resumeStepId?: string,
    ): Promise<{
      executionId: string;
      startAt: Date;
      endAt: Date;
      status: "completed" | "suspended" | "error";
      result: unknown;
      usage: unknown;
      suspension?: unknown;
      error?: unknown;
    } | null>;
  };
  getParentAgentIds?: (agentId: string) => string[];
  logging?: MCPLoggingAdapter;
  prompts?: MCPPromptsAdapter;
  resources?: MCPResourcesAdapter;
  elicitation?: MCPElicitationAdapter;
}

export interface MCPServerLike extends BaseMCPServerLike {
  initialize(deps: MCPServerDeps): void;
  startConfiguredTransports?(options?: Record<string, unknown>): Promise<void>;
  startTransport?(name: keyof ProtocolConfig, options?: Record<string, unknown>): Promise<void>;
  stopTransport?(name: keyof ProtocolConfig): Promise<void>;
  close?(): Promise<void>;
  getMetadata?(): Partial<MCPServerMetadata> & { id?: string };
  hasProtocol?(name: keyof ProtocolConfig): boolean;
  handleStreamableHttpRequest?(options: MCPStreamableHTTPRequestOptions): Promise<void>;
  handleSseRequest?(options: MCPServerSSERequestOptions): Promise<void>;
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
  notifyPromptListChanged?(): Promise<void>;
  notifyResourceListChanged?(): Promise<void>;
  notifyResourceUpdated?(uri: string): Promise<void>;
  createExternalSseSession?(
    bridge: SseBridge,
    messagePath: string,
    contextOverrides?: Partial<Omit<FilterContext, "transport">>,
  ): Promise<{ sessionId: string; completion: Promise<void> }>;
  handleExternalSseMessage?(
    sessionId: string,
    body: unknown,
    headers: Record<string, string>,
  ): Promise<void>;
  closeExternalSseSession?(sessionId: string): Promise<void>;
}

export type MCPServerFactory = BaseMCPServerFactory<MCPServerLike>;

export type {
  CallToolResult,
  GetPromptRequest,
  GetPromptResult,
  Prompt,
  Resource,
  ResourceContents,
  ResourceTemplate,
};

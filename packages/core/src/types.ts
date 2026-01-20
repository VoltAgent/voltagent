/**
 * Basic type definitions for VoltAgent Core
 */

import type { Logger } from "@voltagent/internal";
import type { A2AServerFactory, A2AServerLike } from "@voltagent/internal/a2a";
import type { MCPServerFactory, MCPServerLike } from "@voltagent/internal/mcp";
import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { A2AServerRegistry } from "./a2a";
import type { Agent } from "./agent/agent";
import type { AgentStatus } from "./agent/types";
import type { MCPServerRegistry } from "./mcp";
import type { Memory } from "./memory";
import type { VoltAgentObservability } from "./observability";
import type { ToolStatusInfo } from "./tool";
import type { TriggerRegistry } from "./triggers/registry";
import type { VoltAgentTriggersConfig } from "./triggers/types";
import type { VoltOpsClient } from "./voltops/client";
import type { WorkflowChain } from "./workflow/chain";
import type { RegisteredWorkflow } from "./workflow/registry";
import type { Workflow, WorkflowSuspendController } from "./workflow/types";

export interface MCPLoggingAdapter {
  setLevel?(level: string): Promise<void> | void;
  getLevel?(): Promise<string | undefined> | string | undefined;
}

export interface MCPPromptsAdapter {
  listPrompts(): Promise<unknown[]>;
  getPrompt(params: unknown): Promise<unknown>;
}

export interface MCPResourcesAdapter {
  listResources(): Promise<unknown>;
  readResource(uri: string): Promise<unknown>;
  listResourceTemplates?(): Promise<unknown>;
  subscribe?(params: unknown, headers?: Record<string, string>): Promise<void> | void;
  unsubscribe?(params: unknown): Promise<void> | void;
}

export interface MCPElicitationAdapter {
  sendRequest(request: unknown): Promise<unknown>;
}

export interface ResumableStreamContext {
  conversationId: string;
  agentId?: string;
  userId: string;
}

export interface ResumableStreamAdapter {
  createStream(
    params: ResumableStreamContext & {
      stream: ReadableStream<string>;
      metadata?: Record<string, unknown>;
    },
  ): Promise<string>;
  resumeStream(streamId: string): Promise<ReadableStream<string> | null>;
  getActiveStreamId(params: ResumableStreamContext): Promise<string | null>;
  clearActiveStream(params: ResumableStreamContext & { streamId?: string }): Promise<void>;
}

// Re-export VoltOps types for convenience
export type {
  PromptReference,
  PromptHelper,
  PromptContent,
  CachedPrompt,
  ChatMessage,
  DynamicValue,
  DynamicValueOptions,
  PromptApiClient,
  PromptApiResponse,
  VoltOpsClientOptions,
  VoltOpsPromptManager,
} from "./voltops/types";

/**
 * Server provider interface
 */
export interface IServerProvider {
  start(): Promise<{ port: number }>;
  stop(): Promise<void>;
  isRunning(): boolean;
}

export type ServerlessRequestHandler = (req: Request, ...args: unknown[]) => Promise<Response>;

export type CloudflareFetchHandler = (
  req: Request,
  env: Record<string, unknown>,
  ctx: unknown,
) => Promise<Response>;

export interface IServerlessProvider {
  handleRequest(request: Request): Promise<Response>;
  toCloudflareWorker(): { fetch: CloudflareFetchHandler };
  toVercelEdge(): ServerlessRequestHandler;
  toDeno(): ServerlessRequestHandler;
  auto(): { fetch: CloudflareFetchHandler } | ServerlessRequestHandler;
}

export type ServerlessProviderFactory = (deps: ServerProviderDeps) => IServerlessProvider;

/**
 * Server provider dependencies
 */
export interface ServerProviderDeps {
  agentRegistry: {
    getAgent(id: string): Agent | undefined;
    getAllAgents(): Agent[];
    getAgentCount(): number;
    removeAgent(id: string): boolean;
    registerAgent(agent: Agent): void;
    // getGlobalVoltAgentExporter(): VoltAgentExporter | undefined; // Removed - migrated to OpenTelemetry
    getGlobalVoltOpsClient(): VoltOpsClient | undefined;
    getGlobalLogger(): Logger | undefined;
  };
  workflowRegistry: {
    getWorkflow(id: string): RegisteredWorkflow | undefined;
    getWorkflowsForApi(): unknown[];
    getWorkflowDetailForApi(id: string): unknown;
    getWorkflowCount(): number;
    getAllWorkflowIds(): string[];
    on(event: string, handler: (...args: any[]) => void): void;
    off(event: string, handler: (...args: any[]) => void): void;
    activeExecutions: Map<string, WorkflowSuspendController>;
    resumeSuspendedWorkflow(
      workflowId: string,
      executionId: string,
      resumeData?: any,
      stepId?: string,
    ): Promise<any>;
  };
  logger?: Logger;
  // telemetryExporter?: VoltAgentExporter; // Removed - migrated to OpenTelemetry
  voltOpsClient?: VoltOpsClient;
  observability?: VoltAgentObservability;
  mcp?: {
    registry: MCPServerRegistry;
  };
  a2a?: {
    registry: A2AServerRegistry;
  };
  triggerRegistry: TriggerRegistry;
  resumableStream?: ResumableStreamAdapter;
  resumableStreamDefault?: boolean;
  ensureEnvironment?: (env?: Record<string, unknown>) => void;
}

/**
 * Server provider factory type
 */
export type ServerProviderFactory = (deps: ServerProviderDeps) => IServerProvider;

/**
 * Server API response types
 */
export interface ServerAgentResponse {
  id: string;
  name: string;
  description: string;
  status: AgentStatus; // Using proper AgentStatus type
  model: string;
  tools: ToolStatusInfo[]; // Using proper ToolStatusInfo type
  memory?: Record<string, unknown>;
  subAgents?: ServerAgentResponse[];
  isTelemetryEnabled?: boolean;
}

export interface ServerWorkflowResponse {
  id: string;
  name: string;
  purpose: string;
  stepsCount: number;
  status: "idle" | "running" | "completed" | "error";
  steps: Array<{
    id: string;
    name: string;
    purpose: string | null;
    type: string;
    agentId?: string;
    agentName?: string;
  }>;
}

export interface ServerApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * VoltAgent constructor options
 */
export type VoltAgentOptions = {
  /**
   * Optional agents to register when bootstrapping VoltAgent
   */
  agents?: Record<string, Agent>;
  /**
   * Optional workflows to register with VoltAgent
   * Can be either Workflow instances or WorkflowChain instances
   */
  workflows?: Record<
    string,
    | Workflow<DangerouslyAllowAny, DangerouslyAllowAny, DangerouslyAllowAny, DangerouslyAllowAny>
    | WorkflowChain<
        DangerouslyAllowAny,
        DangerouslyAllowAny,
        DangerouslyAllowAny,
        DangerouslyAllowAny,
        DangerouslyAllowAny
      >
  >;
  /**
   * Default Memory instance used when agent/workflow defaults are not provided.
   */
  memory?: Memory;
  /**
   * Default Memory instance used for agents when they don't specify one.
   * Falls back to `memory` when not provided.
   */
  agentMemory?: Memory;
  /**
   * Default Memory instance used for workflows when they don't specify one.
   * Falls back to `memory` when not provided.
   */
  workflowMemory?: Memory;
  /** Optional VoltOps trigger handlers */
  triggers?: VoltAgentTriggersConfig;
  /**
   * Server provider factory function
   * Example: honoServer({ port: 3141, enableSwaggerUI: true })
   */
  server?: ServerProviderFactory;

  /**
   * Serverless provider factory function for fetch-based runtimes
   * Example: serverlessHono({ corsOrigin: '*' })
   */
  serverless?: ServerlessProviderFactory;

  /**
   * Unified VoltOps client for telemetry and prompt management
   * Replaces the old telemetryExporter approach with a comprehensive solution.
   */
  voltOpsClient?: VoltOpsClient;

  /**
   * Observability instance for OpenTelemetry-compliant tracing
   * Allows sharing the same observability instance between VoltAgent and Agents
   * If not provided, creates a default instance with in-memory storage
   */
  observability?: VoltAgentObservability;

  /**
   * Global logger instance to use across all agents and workflows
   * If not provided, a default logger will be created
   */
  logger?: Logger;

  /**
   * Optional collection of MCP servers to register alongside the primary server.
   * Enables exposing multiple VoltAgent surfaces through separate MCP endpoints.
   */
  mcpServers?: Record<string, MCPServerLike | MCPServerFactory>;

  /**
   * Optional collection of A2A servers to expose agents via the Agent-to-Agent protocol.
   */
  a2aServers?: Record<string, A2AServerLike | A2AServerFactory>;

  // telemetryExporter removed - migrated to OpenTelemetry

  /**
   * @deprecated Use `server.port` instead
   */
  port?: number;
  /**
   * @deprecated Use `server.autoStart` instead
   */
  autoStart?: boolean;
  checkDependencies?: boolean;
  /**
   * @deprecated Server configuration is now done through server provider
   */
  customEndpoints?: unknown[];
  /**
   * @deprecated Server configuration is now done through server provider
   */
  enableSwaggerUI?: boolean;
};

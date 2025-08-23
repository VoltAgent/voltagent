/**
 * Basic type definitions for VoltAgent Core
 */

import type { SpanExporter } from "@opentelemetry/sdk-trace-base";
import type { Logger } from "@voltagent/internal";
import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { Agent } from "./agent/agent";
import type { AgentStatus } from "./agent/types";
import type { VoltAgentExporter } from "./telemetry/exporter";
import type { ToolStatusInfo } from "./tool";
import type { VoltOpsClient } from "./voltops/types";
import type { WorkflowChain } from "./workflow/chain";
import type { RegisteredWorkflow } from "./workflow/registry";
import type { Workflow, WorkflowHistoryEntry, WorkflowSuspendController } from "./workflow/types";

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
    getGlobalVoltAgentExporter(): VoltAgentExporter | undefined;
    getGlobalVoltOpsClient(): VoltOpsClient | undefined;
    getGlobalLogger(): Logger | undefined;
  };
  workflowRegistry: {
    getWorkflow(id: string): RegisteredWorkflow | undefined;
    getWorkflowsForApi(): unknown[];
    getWorkflowDetailForApi(id: string): unknown;
    getWorkflowCount(): number;
    getWorkflowExecutionsAsync(
      workflowId: string,
      limit?: number,
      offset?: number,
    ): Promise<WorkflowHistoryEntry[]>;
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
  agentEventEmitter?: {
    onHistoryUpdate(callback: (agentId: string, historyEntry: any) => void): () => void;
    onHistoryEntryCreated(callback: (agentId: string, historyEntry: any) => void): () => void;
  };
  logger?: Logger;
  telemetryExporter?: VoltAgentExporter;
  voltOpsClient?: VoltOpsClient;
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
  agents: Record<string, Agent>;
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
   * Server provider factory function
   * Example: honoServer({ port: 3141, enableSwaggerUI: true })
   */
  server?: ServerProviderFactory;

  /**
   * Unified VoltOps client for telemetry and prompt management
   * Replaces the old telemetryExporter approach with a comprehensive solution.
   */
  voltOpsClient?: VoltOpsClient;

  /**
   * Global logger instance to use across all agents and workflows
   * If not provided, a default logger will be created
   */
  logger?: Logger;

  /**
   * @deprecated Use `voltOpsClient` instead. Will be removed in a future version.
   * Optional OpenTelemetry SpanExporter instance or array of instances.
   * or a VoltAgentExporter instance or array of instances.
   * If provided, VoltAgent will attempt to initialize and register
   * a NodeTracerProvider with a BatchSpanProcessor for the given exporter(s).
   * It's recommended to only provide this in one VoltAgent instance per application process.
   */
  telemetryExporter?: (SpanExporter | VoltAgentExporter) | (SpanExporter | VoltAgentExporter)[];

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

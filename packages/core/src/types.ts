/**
 * Basic type definitions for VoltAgent Core
 */

import type { Logger } from "@voltagent/internal";
import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { Agent } from "./agent/agent";
import type { AgentStatus } from "./agent/types";
import type { VoltAgentObservability } from "./observability/voltagent-observability";
import type { ToolStatusInfo } from "./tool";
import type { VoltOpsClient } from "./voltops/client";
import type { WorkflowChain } from "./workflow/chain";
import type { RegisteredWorkflow } from "./workflow/registry";
import type { Workflow, WorkflowSuspendController } from "./workflow/types";

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
    // getGlobalVoltAgentExporter(): VoltAgentExporter | undefined; // Removed - migrated to OpenTelemetry
    getGlobalVoltOpsClient(): VoltOpsClient | undefined;
    getGlobalLogger(): Logger | undefined;
  };
  workflowRegistry: {
    getWorkflow(id: string): RegisteredWorkflow | undefined;
    getWorkflowsForApi(): unknown[];
    getWorkflowDetailForApi(id: string): unknown;
    getWorkflowCount(): number;
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

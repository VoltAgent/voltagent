import type { Context } from "hono";
import type { AgentStatus } from "../agent/types";
import type { ToolStatusInfo as CoreToolStatusInfo } from "../tool";

export type { AgentStatus };

export type ApiContext = Context;

export type ToolStatusInfo = CoreToolStatusInfo;

export type AgentResponse = {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  model: string;
  tools: ToolStatusInfo[];
  memory?: Record<string, any>;
  subAgents:
    | Record<string, any>[]
    | {
        id: string;
        name: string;
        description: string;
        status: AgentStatus;
        model: string;
        tools?: ToolStatusInfo[];
        memory?: Record<string, any>;
        isTelemetryEnabled?: boolean;
      }[];
  isTelemetryEnabled?: boolean;
};

export type WorkflowStatus = "idle" | "running" | "completed" | "error";

export type WorkflowStepInfo = {
  id: string;
  name: string;
  purpose: string | null;
  type: string;
  agentId?: string;
  agentName?: string;
};

export type WorkflowResponse = {
  id: string;
  name: string;
  purpose: string;
  stepsCount: number;
  status: WorkflowStatus;
  steps: WorkflowStepInfo[];
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

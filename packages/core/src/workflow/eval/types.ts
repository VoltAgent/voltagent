import type { Logger } from "@voltagent/internal";
import type { LocalScorerDefinition, SamplingPolicy } from "../../eval/runtime";
import type { VoltAgentObservability } from "../../observability";

export type WorkflowEvalOperationType = "run" | "stream";
export type WorkflowEvalTarget = "workflow" | "step";
export type WorkflowEvalStatus = "completed" | "suspended" | "cancelled" | "error" | "skipped";

export interface WorkflowEvalStepInfo {
  id: string;
  name?: string;
  index?: number;
  type?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowEvalPayload {
  target: WorkflowEvalTarget;
  executionId: string;
  workflowId: string;
  workflowName: string;
  operationType: WorkflowEvalOperationType;
  status: WorkflowEvalStatus;
  input?: string | null;
  output?: string | null;
  rawInput?: unknown;
  rawOutput?: unknown;
  userId?: string;
  conversationId?: string;
  traceId: string;
  spanId: string;
  metadata?: Record<string, unknown>;
  step?: WorkflowEvalStepInfo;
}

export type WorkflowEvalContext = WorkflowEvalPayload &
  Record<string, unknown> & {
    timestamp: string;
    rawPayload: WorkflowEvalPayload;
  };

export type WorkflowEvalParams = Record<string, unknown>;

export type WorkflowEvalSamplingPolicy = SamplingPolicy;

export type WorkflowEvalScorerFactory = () =>
  | LocalScorerDefinition<WorkflowEvalContext, Record<string, unknown>>
  | Promise<LocalScorerDefinition<WorkflowEvalContext, Record<string, unknown>>>;

export type WorkflowEvalScorerReference =
  | LocalScorerDefinition<WorkflowEvalContext, Record<string, unknown>>
  | WorkflowEvalScorerFactory;

export interface WorkflowEvalResult {
  scorerId: string;
  scorerName?: string;
  status: "success" | "error" | "skipped";
  score?: number | null;
  metadata?: Record<string, unknown> | null;
  error?: unknown;
  durationMs?: number;
  payload: WorkflowEvalPayload;
  rawPayload: WorkflowEvalPayload;
}

export interface WorkflowEvalScorerConfig {
  scorer: WorkflowEvalScorerReference;
  params?:
    | WorkflowEvalParams
    | ((
        context: WorkflowEvalContext,
      ) => WorkflowEvalParams | undefined | Promise<WorkflowEvalParams | undefined>);
  sampling?: WorkflowEvalSamplingPolicy;
  id?: string;
  onResult?: (result: WorkflowEvalResult) => void | Promise<void>;
  buildPayload?: (
    context: WorkflowEvalContext,
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;
  buildParams?: (
    context: WorkflowEvalContext,
  ) => WorkflowEvalParams | undefined | Promise<WorkflowEvalParams | undefined>;
}

export interface WorkflowEvalStepConfig {
  scorers: Record<string, WorkflowEvalScorerConfig>;
  triggerSource?: string;
  environment?: string;
  sampling?: WorkflowEvalSamplingPolicy;
  redact?: (payload: WorkflowEvalPayload) => WorkflowEvalPayload;
}

export interface WorkflowEvalConfig extends WorkflowEvalStepConfig {
  steps?: Record<string, WorkflowEvalStepConfig>;
}

export interface WorkflowEvalHost {
  readonly id: string;
  readonly name: string;
  readonly logger: Logger;
  readonly evalConfig?: WorkflowEvalConfig;
  getObservability(): VoltAgentObservability;
}

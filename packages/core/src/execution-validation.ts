import type { Logger } from "@voltagent/internal";
import type { Agent } from "./agent/agent";
import {
  type ClientHttpErrorCode,
  ExecutionValidationError,
} from "./agent/errors/client-http-errors";
import type { ToolExecuteOptions } from "./agent/providers/base/types";
import type { OperationContext } from "./agent/types";
import type { ProviderTool, Tool } from "./tool";
import type { WorkflowRunOptions, WorkflowStateStore } from "./workflow/types";

export type ExecutionValidationFailure = {
  pass: false;
  message?: string;
  code?: string;
  httpStatus?: ClientHttpErrorCode;
  metadata?: Record<string, unknown>;
};

export type ExecutionValidationPass = {
  pass: true;
};

export type ExecutionValidationResult =
  | undefined
  | boolean
  | ExecutionValidationPass
  | ExecutionValidationFailure;

export type ExecutionValidator<TContext> = (
  context: TContext,
) => ExecutionValidationResult | Promise<ExecutionValidationResult>;

export interface ToolExecutionValidationContext {
  type: "tool";
  agent?: Agent;
  tool: Tool<any, any> | ProviderTool;
  toolName: string;
  args: unknown;
  options?: ToolExecuteOptions;
  operationContext?: OperationContext;
  toolCallId: string;
  messages: unknown[];
  timestamp: Date;
}

export type ToolExecutionValidator = ExecutionValidator<ToolExecutionValidationContext>;

export interface AgentExecutionValidators {
  tools?: ToolExecutionValidator[];
}

export interface WorkflowExecutionValidationContext {
  type: "workflow";
  workflowId: string;
  workflowName?: string;
  input: unknown;
  options?: WorkflowRunOptions;
  executionId: string;
  context: Map<string | symbol, unknown>;
  workflowState: WorkflowStateStore;
  timestamp: Date;
  logger?: Logger;
}

export type WorkflowExecutionValidator = ExecutionValidator<WorkflowExecutionValidationContext>;

const isValidationFailure = (value: unknown): value is ExecutionValidationFailure =>
  typeof value === "object" &&
  value !== null &&
  "pass" in value &&
  (value as { pass?: unknown }).pass === false;

export async function runExecutionValidators<TContext>(
  validators: readonly ExecutionValidator<TContext>[] | undefined,
  context: TContext,
  defaultFailureMessage: string,
  defaultCode: string,
): Promise<void> {
  if (!validators || validators.length === 0) {
    return;
  }

  for (const validator of validators) {
    const result = await validator(context);

    if (result === false) {
      throw new ExecutionValidationError({
        message: defaultFailureMessage,
        code: defaultCode,
      });
    }

    if (isValidationFailure(result)) {
      throw new ExecutionValidationError({
        message: result.message ?? defaultFailureMessage,
        code: result.code ?? defaultCode,
        httpStatus: result.httpStatus,
        metadata: result.metadata,
      });
    }
  }
}

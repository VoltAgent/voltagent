import type { Span } from "@opentelemetry/api";
import type { Logger } from "@voltagent/internal";
import type { UIMessage } from "ai";
import type { Agent } from "../../agent/agent";
import {
  type NormalizedInputGuardrail,
  type NormalizedOutputGuardrail,
  normalizeInputGuardrailList,
  normalizeOutputGuardrailList,
  runInputGuardrails,
  runOutputGuardrails,
} from "../../agent/guardrail";
import type { BaseMessage } from "../../agent/providers";
import type {
  AgentEvalOperationType,
  InputGuardrail,
  OperationContext,
  OutputGuardrail,
} from "../../agent/types";
import { randomUUID } from "../../utils/id";
import type { WorkflowTraceContext } from "../open-telemetry/trace-context";

export type WorkflowGuardrailInput = string | UIMessage[] | BaseMessage[];

export type WorkflowGuardrailSet = {
  input: NormalizedInputGuardrail[];
  output: NormalizedOutputGuardrail[];
};

const DEFAULT_GUARDRAIL_OPERATION: AgentEvalOperationType = "workflow";

const createNoopSpan = (): Span =>
  ({
    setAttribute: () => undefined,
    setAttributes: () => undefined,
    addEvent: () => undefined,
    setStatus: () => undefined,
    end: () => undefined,
    recordException: () => undefined,
  }) as unknown as Span;

type GuardrailTraceContext = {
  createChildSpan: (
    name: string,
    type: string,
    options?: { label?: string; attributes?: Record<string, unknown> },
  ) => Span;
  withSpan: <T>(span: Span, fn: () => T | Promise<T>) => Promise<T>;
  setInput: (input: unknown) => void;
  setOutput: (output: unknown) => void;
  end: (status: "completed" | "error", error?: Error) => void;
  getRootSpan: () => Span;
};

const createNoopGuardrailTraceContext = (): GuardrailTraceContext => ({
  createChildSpan: () => createNoopSpan(),
  withSpan: async (_span, fn) => await fn(),
  setInput: () => undefined,
  setOutput: () => undefined,
  end: () => undefined,
  getRootSpan: () => createNoopSpan(),
});

const createWorkflowGuardrailTraceContext = (
  traceContext?: WorkflowTraceContext,
  parentSpan?: Span,
): GuardrailTraceContext => {
  if (!traceContext) {
    return createNoopGuardrailTraceContext();
  }

  return {
    createChildSpan: (name, type, options) =>
      traceContext.createChildSpan(name, type, { ...options, parentSpan }),
    withSpan: (span, fn) => traceContext.withSpan(span, fn),
    setInput: (input) => traceContext.setInput(input),
    setOutput: (output) => traceContext.setOutput(output),
    end: () => undefined,
    getRootSpan: () => traceContext.getRootSpan(),
  };
};

const createWorkflowGuardrailAgentStub = ({
  workflowId,
  workflowName,
}: {
  workflowId?: string;
  workflowName?: string;
}): Agent => {
  const id = workflowId ? `workflow:${workflowId}` : "workflow";
  const name = workflowName || workflowId || "Workflow";
  const baseAgent = { id, name };

  return new Proxy(baseAgent, {
    get(target, prop) {
      if (prop in target) {
        return target[prop as keyof typeof target];
      }
      throw new Error(
        "Workflow guardrails do not expose agent methods. Provide guardrailAgent in workflow config or run options.",
      );
    },
  }) as unknown as Agent;
};

export const isWorkflowGuardrailInput = (value: unknown): value is WorkflowGuardrailInput =>
  typeof value === "string" || Array.isArray(value);

export const resolveWorkflowGuardrailSets = ({
  inputGuardrails,
  outputGuardrails,
  optionInputGuardrails,
  optionOutputGuardrails,
}: {
  inputGuardrails?: InputGuardrail[];
  outputGuardrails?: OutputGuardrail<any>[];
  optionInputGuardrails?: InputGuardrail[];
  optionOutputGuardrails?: OutputGuardrail<any>[];
}): WorkflowGuardrailSet => {
  const baseInput = inputGuardrails ?? [];
  const baseOutput = outputGuardrails ?? [];
  const optionInput = optionInputGuardrails ?? [];
  const optionOutput = optionOutputGuardrails ?? [];

  const normalizedBaseInput = normalizeInputGuardrailList(baseInput);
  const normalizedBaseOutput = normalizeOutputGuardrailList(baseOutput);
  const normalizedOptionInput = normalizeInputGuardrailList(
    optionInput,
    normalizedBaseInput.length,
  );
  const normalizedOptionOutput = normalizeOutputGuardrailList(
    optionOutput,
    normalizedBaseOutput.length,
  );

  return {
    input: [...normalizedBaseInput, ...normalizedOptionInput],
    output: [...normalizedBaseOutput, ...normalizedOptionOutput],
  };
};

export type WorkflowGuardrailRuntime = {
  operationContext: OperationContext;
  guardrailAgent: Agent;
};

export const createWorkflowGuardrailRuntime = ({
  workflowId,
  workflowName,
  executionId,
  traceContext,
  logger,
  userId,
  conversationId,
  context,
  guardrailAgent,
  parentSpan,
  operationId,
}: {
  workflowId?: string;
  workflowName?: string;
  executionId?: string;
  traceContext?: WorkflowTraceContext;
  logger: Logger;
  userId?: string;
  conversationId?: string;
  context?: Map<string | symbol, unknown>;
  guardrailAgent?: Agent;
  parentSpan?: Span;
  operationId?: string;
}): WorkflowGuardrailRuntime => {
  const resolvedGuardrailAgent =
    guardrailAgent ?? createWorkflowGuardrailAgentStub({ workflowId, workflowName });
  const guardrailTraceContext = createWorkflowGuardrailTraceContext(traceContext, parentSpan);
  const resolvedOperationId =
    operationId || [workflowId, executionId, "guardrail", randomUUID()].filter(Boolean).join(":");

  const operationContext: OperationContext = {
    operationId: resolvedOperationId,
    userId,
    conversationId,
    context: context ?? new Map(),
    systemContext: new Map(),
    isActive: true,
    traceContext: guardrailTraceContext as OperationContext["traceContext"],
    logger,
    abortController: new AbortController(),
    startTime: new Date(),
  };

  return {
    operationContext,
    guardrailAgent: resolvedGuardrailAgent,
  };
};

export const applyWorkflowInputGuardrails = async (
  input: WorkflowGuardrailInput,
  guardrails: NormalizedInputGuardrail[],
  runtime: WorkflowGuardrailRuntime,
  operation: AgentEvalOperationType = DEFAULT_GUARDRAIL_OPERATION,
): Promise<WorkflowGuardrailInput> => {
  if (!guardrails.length) {
    return input;
  }

  runtime.operationContext.input = input;
  return runInputGuardrails(
    input,
    runtime.operationContext,
    guardrails,
    operation,
    runtime.guardrailAgent,
  );
};

export const applyWorkflowOutputGuardrails = async <TOutput>(
  output: TOutput,
  guardrails: NormalizedOutputGuardrail[],
  runtime: WorkflowGuardrailRuntime,
  operation: AgentEvalOperationType = DEFAULT_GUARDRAIL_OPERATION,
): Promise<TOutput> => {
  if (!guardrails.length) {
    return output;
  }

  runtime.operationContext.output = output as OperationContext["output"];
  return runOutputGuardrails({
    output,
    operationContext: runtime.operationContext,
    guardrails,
    operation,
    agent: runtime.guardrailAgent,
  });
};

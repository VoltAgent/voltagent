import { normalizeInputGuardrailList, normalizeOutputGuardrailList } from "../../agent/guardrail";
import {
  applyWorkflowInputGuardrails,
  applyWorkflowOutputGuardrails,
  createWorkflowGuardrailRuntime,
  isWorkflowGuardrailInput,
} from "../internal/guardrails";
import type { WorkflowExecuteContext } from "../internal/types";
import { defaultStepConfig } from "../internal/utils";
import type { WorkflowStepGuardrail, WorkflowStepGuardrailConfig } from "./types";

/**
 * Applies guardrails to the current workflow data.
 * Use input guardrails for string/message data and output guardrails for structured data.
 */
export function andGuardrail<INPUT, DATA>({
  inputGuardrails,
  outputGuardrails,
  ...config
}: WorkflowStepGuardrailConfig<INPUT, DATA>) {
  const normalizedInputGuardrails = inputGuardrails
    ? normalizeInputGuardrailList(inputGuardrails)
    : [];
  const normalizedOutputGuardrails = outputGuardrails
    ? normalizeOutputGuardrailList(outputGuardrails)
    : [];

  return {
    ...defaultStepConfig(config),
    type: "guardrail",
    inputGuardrails,
    outputGuardrails,
    execute: async (context: WorkflowExecuteContext<INPUT, DATA, any, any>) => {
      if (normalizedInputGuardrails.length === 0 && normalizedOutputGuardrails.length === 0) {
        return context.data;
      }

      const workflowContext = context.state.workflowContext;
      const guardrailRuntime = createWorkflowGuardrailRuntime({
        workflowId: workflowContext?.workflowId,
        workflowName: workflowContext?.workflowName,
        executionId: workflowContext?.executionId,
        traceContext: workflowContext?.traceContext,
        logger: context.logger,
        userId: context.state.userId,
        conversationId: context.state.conversationId,
        context: (workflowContext?.context ?? context.state.context) as
          | Map<string | symbol, unknown>
          | undefined,
        guardrailAgent: workflowContext?.guardrailAgent,
        parentSpan: workflowContext?.currentStepSpan,
        operationId: workflowContext?.executionId
          ? `${workflowContext.executionId}:guardrail:${config.id}`
          : undefined,
      });

      let currentData: DATA = context.data;

      if (normalizedInputGuardrails.length > 0) {
        if (!isWorkflowGuardrailInput(currentData)) {
          throw new Error(
            "andGuardrail input guardrails require string or message input. Use outputGuardrails for structured data.",
          );
        }
        const guardrailedInput = await applyWorkflowInputGuardrails(
          currentData,
          normalizedInputGuardrails,
          guardrailRuntime,
        );
        currentData = guardrailedInput as DATA;
      }

      if (normalizedOutputGuardrails.length > 0) {
        currentData = (await applyWorkflowOutputGuardrails(
          currentData,
          normalizedOutputGuardrails,
          guardrailRuntime,
        )) as DATA;
      }

      return currentData;
    },
  } satisfies WorkflowStepGuardrail<INPUT, DATA>;
}

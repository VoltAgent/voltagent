import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import { vi } from "vitest";
import type { BaseMessage } from "../../agent/providers";
import type { WorkflowExecuteContext } from "../../workflow/internal/types";
import type { WorkflowStateUpdater } from "../../workflow/types";

export type MockWorkflowInput = BaseMessage | BaseMessage[] | string | object;

export type MockWorkflowExecuteContext<
  INPUT = MockWorkflowInput,
  DATA = MockWorkflowInput,
  SUSPEND = DangerouslyAllowAny,
  RESUME = DangerouslyAllowAny,
> = WorkflowExecuteContext<INPUT, DATA, SUSPEND, RESUME>;

/**
 * Get a mock execute context
 * @returns A mock execute context
 */
export function createMockWorkflowExecuteContext(
  overrides: Partial<MockWorkflowExecuteContext> = {},
) {
  const context: MockWorkflowExecuteContext = {
    data: overrides.data ?? ({} as DangerouslyAllowAny),
    state: overrides.state ?? ({} as DangerouslyAllowAny),
    getStepData: overrides.getStepData ?? (() => undefined),
    suspend: overrides.suspend ?? vi.fn(),
    workflowState: overrides.workflowState ?? {},
    setWorkflowState: (() => undefined) as MockWorkflowExecuteContext["setWorkflowState"],
    logger: overrides.logger ?? {
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn(),
    },
    writer: overrides.writer ?? {
      write: vi.fn(),
      pipeFrom: vi.fn(),
    },
  };

  context.setWorkflowState =
    overrides.setWorkflowState ??
    ((update: WorkflowStateUpdater) => {
      const nextState = typeof update === "function" ? update(context.workflowState) : update;
      context.workflowState = nextState;
    });

  return context;
}

import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type * as TF from "type-fest";
import { v4 as uuid } from "uuid";
import type { UsageInfo } from "../../agent/providers";
import type { UserContext } from "../../agent/types";
import { getGlobalLogger } from "../../logger";
import type {
  WorkflowCancellationMetadata,
  WorkflowRunOptions,
  WorkflowStateStore,
  WorkflowSuspensionMetadata,
} from "../types";
import type { InternalExtractWorkflowInputData } from "./types";

export type WorkflowStateStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "suspended"
  | "cancelled";

export type WorkflowState<INPUT, RESULT> = {
  executionId: string;
  conversationId?: string;
  userId?: string;
  context?: UserContext;
  active: number;
  startAt: Date;
  endAt: Date | null;
  status: WorkflowStateStatus;
  /** the initial input data to the workflow */
  input: InternalExtractWorkflowInputData<INPUT>;
  /** current data being processed */
  data: DangerouslyAllowAny;
  /** shared workflow state across steps */
  workflowState: WorkflowStateStore;
  /** the result of workflow execution, null until execution is complete */
  result: RESULT | null;
  error: Error | null;
  /** suspension metadata when workflow is suspended */
  suspension?: WorkflowSuspensionMetadata;
  /** cancellation metadata when workflow is cancelled */
  cancellation?: WorkflowCancellationMetadata;
  /** accumulated usage from andAgent calls */
  usage: UsageInfo;
};

export interface WorkflowStateManager<DATA, RESULT> {
  /**
   * The current state of the workflow
   */
  state: WorkflowState<DATA, RESULT>;
  /**
   * Start the workflow
   */
  start: (initialData: DATA, config?: WorkflowRunOptions) => void;
  /**
   * Update the state of the workflow
   * @param stateUpdate - The partial state to update
   * @returns The updated state
   */
  update: (
    stateUpdate: Partial<MutableWorkflowState<DATA, RESULT>>,
  ) => MutableWorkflowState<DATA, RESULT>;
  /**
   * Fail the workflow
   * @param error - The error to fail the workflow with
   * @returns The updated state
   */
  fail: (error?: unknown) => Error;
  /**
   * Finish the workflow
   * @returns The updated state
   */
  finish: () => {
    executionId: string;
    startAt: Date;
    endAt: Date;
    status: "completed";
    result: RESULT;
  };
  /**
   * Suspend the workflow
   * @param reason - The reason for suspension
   * @param checkpoint - Optional checkpoint data for resumption
   * @param suspendedStepIndex - Optional step index where suspension occurred
   * @returns The suspension metadata
   */
  suspend: (
    reason?: string,
    checkpoint?: WorkflowSuspensionMetadata["checkpoint"],
    suspendedStepIndex?: number,
    lastEventSequence?: number,
  ) => WorkflowSuspensionMetadata;
  /**
   * Cancel the workflow execution
   */
  cancel: (reason?: string) => void;
}

/**
 * Creates a manager for the state of a workflow
 * @param initialState - The initial state of the workflow
 * @returns A manager for the state of the workflow
 */
export function createWorkflowStateManager<DATA, RESULT>(): WorkflowStateManager<DATA, RESULT> {
  return new WorkflowStateManagerInternal<DATA, RESULT>();
}

/*
|------------------
| Internal
|------------------
*/

class WorkflowStateManagerInternal<DATA, RESULT> implements WorkflowStateManager<DATA, RESULT> {
  #state: Omit<WorkflowState<DATA, RESULT>, "input"> | null = null;
  #input: DATA | null = null;

  get state(): WorkflowState<DATA, RESULT> {
    if (hasState(this.#state) && this.#input !== null) {
      return {
        ...this.#state,
        input: this.#input as InternalExtractWorkflowInputData<DATA>,
      };
    }
    throw new Error("State is not set and cannot be accessed");
  }

  start(data: DATA, config?: WorkflowRunOptions) {
    this.#input = data;
    this.#state = {
      executionId: config?.executionId ?? uuid(),
      active: config?.active ?? 0,
      userId: config?.userId,
      conversationId: config?.conversationId,
      context: config?.context,
      startAt: new Date(),
      endAt: null,
      data: data,
      workflowState: config?.workflowState ?? {},
      status: "running",
      result: null,
      error: null,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    };

    return this.#state;
  }

  update(stateUpdate: Partial<MutableWorkflowState<DATA, RESULT>>) {
    assertCanMutate(this.#state);
    this.#state = {
      ...this.#state,
      ...transformToMutableState(stateUpdate),
    };
    return {
      ...this.#state,
      input: this.#input as InternalExtractWorkflowInputData<DATA>,
    };
  }

  finish() {
    assertCanMutate(this.#state);
    this.#input = this.#state.data as DATA;
    this.#internalUpdate({
      endAt: new Date(),
      status: "completed",
    });
    return {
      executionId: this.#state.executionId,
      startAt: this.#state.startAt,
      // biome-ignore lint/style/noNonNullAssertion: this is safe
      endAt: this.#state.endAt!,
      status: this.#state.status as "completed",
      result: this.#state.result as RESULT,
    };
  }

  fail(error?: unknown) {
    assertCanMutate(this.#state);
    const err = error instanceof Error ? error : new Error(String(error));
    this.#internalUpdate({
      error: err,
      endAt: new Date(),
      status: "failed",
    });
    return err;
  }

  suspend<SUSPEND_DATA = any>(
    reason?: string,
    checkpoint?: WorkflowSuspensionMetadata["checkpoint"],
    suspendedStepIndex?: number,
    lastEventSequence?: number,
    suspendData?: SUSPEND_DATA,
  ) {
    assertCanMutate(this.#state);
    getGlobalLogger()
      .child({ component: "workflow", context: "WorkflowStateManager" })
      .debug(`Suspending workflow with reason: ${reason}, stepIndex: ${suspendedStepIndex}`);
    const suspensionMetadata: WorkflowSuspensionMetadata<SUSPEND_DATA> = {
      suspendedAt: new Date(),
      reason,
      suspendedStepIndex: suspendedStepIndex ?? this.#state.active,
      lastEventSequence,
      checkpoint,
      suspendData,
    };
    this.#internalUpdate({
      status: "suspended",
      suspension: suspensionMetadata,
    });
    getGlobalLogger()
      .child({ component: "workflow", context: "WorkflowStateManager" })
      .debug(`Workflow suspended with status: ${this.#state.status}`, suspensionMetadata);
    return suspensionMetadata;
  }

  cancel(reason?: string) {
    assertCanMutate(this.#state);
    const cancelledAt = new Date();
    this.#internalUpdate({
      endAt: cancelledAt,
      status: "cancelled",
      cancellation: {
        reason,
        cancelledAt,
      },
      suspension: undefined,
    });
  }

  #internalUpdate(stateUpdate: Partial<WorkflowState<DATA, RESULT>>) {
    assertCanMutate(this.#state);
    this.#state = {
      ...this.#state,
      ...stateUpdate,
    };
  }
}

type MutableWorkflowState<DATA, RESULT> = Pick<
  Partial<WorkflowState<DATA, RESULT>>,
  "data" | "result" | "workflowState"
>;

function transformToMutableState<DATA, RESULT>(
  state: MutableWorkflowState<DATA, RESULT>,
): MutableWorkflowState<DATA, RESULT> {
  const nextState: MutableWorkflowState<DATA, RESULT> = {};

  if (state.data !== undefined) {
    nextState.data = state.data;
  }

  if (state.result !== undefined) {
    nextState.result = state.result;
  }

  if (state.workflowState !== undefined) {
    nextState.workflowState = state.workflowState;
  }

  return nextState;
}

function assertCanMutate(value: unknown): asserts value is RunningWorkflowState {
  if (!hasState(value) || value.status === "completed" || value.status === "failed") {
    throw new Error("Cannot mutate state after workflow has finished");
  }
}

function hasState(value: unknown): value is BaseWorkflowState {
  return value !== null;
}

type BaseWorkflowState = WorkflowState<DangerouslyAllowAny, DangerouslyAllowAny>;

type RunningWorkflowState = TF.Simplify<
  Omit<BaseWorkflowState, "status"> & {
    status: Exclude<BaseWorkflowState["status"], "completed" | "failed">;
  }
>;

import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type * as TF from "type-fest";
import { v4 as uuid } from "uuid";
import type { WorkflowRunOptions, WorkflowState } from "../types";

// TODO: Add in the core context from VoltAgent
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
  update: (stateUpdate: Partial<WorkflowState<DATA, RESULT>>) => WorkflowState<DATA, RESULT>;
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
  #state: WorkflowState<DATA, RESULT> | null = null;

  get state(): WorkflowState<DATA, RESULT> {
    if (hasState(this.#state)) {
      return this.#state;
    }
    throw new Error("State is not set and cannot be accessed");
  }

  start(data: DATA, config?: WorkflowRunOptions) {
    this.#state = {
      executionId: config?.executionId ?? uuid(),
      active: config?.active ?? 0,
      startAt: new Date(),
      endAt: null,
      data,
      status: "running",
      result: null,
      error: null,
    };

    return this.#state;
  }

  update(stateUpdate: Partial<WorkflowState<DATA, RESULT>>) {
    assertCanMutate(this.#state);
    this.#state = {
      ...this.#state,
      ...stateUpdate,
    };
    return this.#state;
  }

  finish() {
    assertCanMutate(this.#state);
    const state = this.update({
      endAt: new Date(),
      status: "completed",
    });
    return {
      executionId: state.executionId,
      startAt: state.startAt,
      // biome-ignore lint/style/noNonNullAssertion: this is safe
      endAt: state.endAt!,
      status: state.status as "completed",
      result: state.result as RESULT,
    };
  }

  fail(error?: unknown) {
    assertCanMutate(this.#state);
    const err = error instanceof Error ? error : new Error(String(error));
    this.update({
      error: err,
      endAt: new Date(),
      status: "failed",
    });
    return err;
  }
}

function assertCanMutate(value: BaseWorkflowState | null): asserts value is RunningWorkflowState {
  if (!hasState(value) || value.status === "completed" || value.status === "failed") {
    throw new Error("Cannot mutate state after workflow has finished");
  }
}

function hasState(value: BaseWorkflowState | null): value is BaseWorkflowState {
  return value !== null;
}

type BaseWorkflowState = WorkflowState<DangerouslyAllowAny, DangerouslyAllowAny>;

type RunningWorkflowState = TF.Simplify<
  Omit<BaseWorkflowState, "status"> & {
    status: Exclude<BaseWorkflowState["status"], "completed" | "failed">;
  }
>;

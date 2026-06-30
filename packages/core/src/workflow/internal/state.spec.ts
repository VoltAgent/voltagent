import { beforeEach, describe, expect, it } from "vitest";
import { createWorkflowStateManager } from "./state";
import type { WorkflowStateManager } from "./state";

describe("WorkflowStateManager", () => {
  let stateManager: WorkflowStateManager<any, any>;

  beforeEach(() => {
    stateManager = createWorkflowStateManager();
  });

  describe("suspend", () => {
    it("should suspend workflow with metadata", () => {
      // Start workflow first
      stateManager.start({ initialData: "test" }, { active: 2 });

      // Suspend workflow
      const suspensionMetadata = stateManager.suspend("User requested", {
        stepExecutionState: { current: "state" },
        completedStepsData: ["step1", "step2"],
      });

      expect(suspensionMetadata).toEqual({
        suspendedAt: expect.any(Date),
        reason: "User requested",
        suspendedStepIndex: 2,
        checkpoint: {
          stepExecutionState: { current: "state" },
          completedStepsData: ["step1", "step2"],
        },
      });

      expect(stateManager.state.status).toBe("suspended");
      expect(stateManager.state.suspension).toEqual(suspensionMetadata);
    });

    it("should suspend without checkpoint data", () => {
      stateManager.start({ data: "test" }, { active: 1 });

      const suspensionMetadata = stateManager.suspend("Emergency stop");

      expect(suspensionMetadata).toEqual({
        suspendedAt: expect.any(Date),
        reason: "Emergency stop",
        suspendedStepIndex: 1,
        checkpoint: undefined,
      });

      expect(stateManager.state.status).toBe("suspended");
    });

    it("should not allow suspend on completed workflow", () => {
      stateManager.start({ data: "test" });
      stateManager.update({ result: "done" });
      stateManager.finish();

      expect(() => {
        stateManager.suspend("Try to suspend");
      }).toThrow("Cannot mutate state after workflow has finished");
    });

    it("should not allow suspend on failed workflow", () => {
      stateManager.start({ data: "test" });
      stateManager.fail(new Error("Test error"));

      expect(() => {
        stateManager.suspend("Try to suspend");
      }).toThrow("Cannot mutate state after workflow has finished");
    });

    it("should track suspension in workflow state", () => {
      stateManager.start({ input: "test" }, { active: 3 });

      const beforeSuspend = { ...stateManager.state };
      expect(beforeSuspend.suspension).toBeUndefined();
      expect(beforeSuspend.status).toBe("running");

      const metadata = stateManager.suspend("Pause requested", {
        stepExecutionState: { step: 3, data: "partial" },
      });

      const afterSuspend = stateManager.state;
      expect(afterSuspend.status).toBe("suspended");
      expect(afterSuspend.suspension).toBe(metadata);
      expect(afterSuspend.suspension?.suspendedStepIndex).toBe(3);
      expect(afterSuspend.suspension?.checkpoint?.stepExecutionState).toEqual({
        step: 3,
        data: "partial",
      });
    });

    it("should allow operations after suspension", () => {
      stateManager.start({ data: "initial" });

      // Suspend
      stateManager.suspend("Pause");
      expect(stateManager.state.status).toBe("suspended");

      // Should still allow updates
      const updated = stateManager.update({ data: "updated" });
      expect(updated.data).toBe("updated");

      // Should allow fail
      const error = stateManager.fail("Failure after suspend");
      expect(error.message).toBe("Failure after suspend");
      expect(stateManager.state.status).toBe("failed");
    });
  });

  describe("workflow state transitions", () => {
    it("should transition from pending to running to suspended", () => {
      // Initial state is created on start
      stateManager.start({ data: "test" });
      expect(stateManager.state.status).toBe("running");

      // Suspend
      stateManager.suspend("Test suspension");
      expect(stateManager.state.status).toBe("suspended");
    });

    it("should transition from suspended to completed", () => {
      stateManager.start({ data: "test" });
      stateManager.suspend("Pause");
      expect(stateManager.state.status).toBe("suspended");

      // Can still finish from suspended state
      const result = stateManager.finish();
      expect(result.status).toBe("completed");
    });

    it("should preserve the original input after the workflow finishes", () => {
      stateManager.start({ value: "original" });
      stateManager.update({ data: { value: "final" } });
      stateManager.finish();

      // `input` is documented as the initial input and must survive completion;
      // only `data` should reflect the final value.
      expect(stateManager.state.input).toEqual({ value: "original" });
      expect(stateManager.state.data).toEqual({ value: "final" });
    });

    it("should transition from suspended to failed", () => {
      stateManager.start({ data: "test" });
      stateManager.suspend("Pause");
      expect(stateManager.state.status).toBe("suspended");

      // Can fail from suspended state
      stateManager.fail("Error after suspend");
      expect(stateManager.state.status).toBe("failed");
    });
  });
});

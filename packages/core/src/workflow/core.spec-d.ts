import { describe, expectTypeOf, it } from "vitest";
import { andForEach, andThen } from "./";
import type { WorkflowExecuteContext } from "./internal/types";
import type { WorkflowStateStore, WorkflowStateUpdater } from "./types";

describe("non-chaining API type inference", () => {
  describe("andThen", () => {
    it("should have workflowState in execute context", () => {
      const step = andThen({
        id: "test",
        execute: async (context) => {
          // workflowState should be available and typed
          expectTypeOf(context.workflowState).toEqualTypeOf<WorkflowStateStore>();
          expectTypeOf(context.setWorkflowState).toEqualTypeOf<
            (update: WorkflowStateUpdater) => void
          >();
          return context.data;
        },
      });
      expectTypeOf(step).not.toBeNever();
    });
  });

  describe("andForEach", () => {
    it("should have workflowState in items selector context", () => {
      const step = andForEach({
        id: "test",
        items: async (context) => {
          // workflowState should be available in items selector
          expectTypeOf(context.workflowState).toEqualTypeOf<WorkflowStateStore>();
          return [1, 2, 3];
        },
        step: andThen({
          id: "inner",
          execute: async ({ data }) => (data as number) * 2,
        }),
      });
      expectTypeOf(step).not.toBeNever();
    });

    it("should have workflowState in map function context", () => {
      const step = andForEach({
        id: "test",
        map: (context, item, index) => {
          // workflowState should be available in map function
          expectTypeOf(context.workflowState).toEqualTypeOf<WorkflowStateStore>();
          return { item, index };
        },
        step: andThen({
          id: "inner",
          execute: async ({ data }) => data,
        }),
      });
      expectTypeOf(step).not.toBeNever();
    });
  });

  describe("type parity with chaining API", () => {
    it("WorkflowExecuteContext should match chaining API context shape", () => {
      // Verify WorkflowExecuteContext has all expected properties
      type Context = WorkflowExecuteContext<{ input: string }, { data: number }, unknown, unknown>;

      expectTypeOf<Context["data"]>().toEqualTypeOf<{ data: number }>();
      expectTypeOf<Context["workflowState"]>().toEqualTypeOf<WorkflowStateStore>();
      expectTypeOf<Context["setWorkflowState"]>().toEqualTypeOf<
        (update: WorkflowStateUpdater) => void
      >();
      expectTypeOf<Context["suspend"]>().toBeFunction();
      expectTypeOf<Context["getStepData"]>().toBeFunction();
      expectTypeOf<Context["logger"]>().not.toBeNever();
      expectTypeOf<Context["writer"]>().not.toBeNever();
    });
  });
});

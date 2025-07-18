import { describe, it, expectTypeOf } from "vitest";
import { z } from "zod";
import { createWorkflowChain } from "./chain";
import type { WorkflowExecuteContext } from "./internal/types";

describe("Workflow Suspend/Resume Type Inference", () => {
  it("should infer suspend data type from suspendSchema", () => {
    const workflow = createWorkflowChain({
      id: "type-test",
      name: "Type Test",
      purpose: "Test suspend type inference",
      input: z.object({
        value: z.number(),
      }),
      result: z.object({
        processed: z.boolean(),
      }),
      suspendSchema: z.object({
        currentValue: z.number(),
        timestamp: z.string(),
        reason: z.string().optional(),
      }),
    }).andThen({
      id: "step-1",
      execute: async ({ suspend }) => {
        // This should compile - correct types
        await suspend("test", {
          currentValue: 42,
          timestamp: new Date().toISOString(),
        });

        // This should also work with optional field
        await suspend("test", {
          currentValue: 42,
          timestamp: new Date().toISOString(),
          reason: "optional reason",
        });

        return { processed: true };
      },
    });

    expectTypeOf(workflow).not.toBeNever();
  });

  it("should infer resume data type from resumeSchema", () => {
    const workflow = createWorkflowChain({
      id: "resume-type-test",
      name: "Resume Type Test",
      purpose: "Test resume type inference",
      input: z.object({
        initialValue: z.number(),
      }),
      result: z.object({
        finalValue: z.number(),
      }),
      resumeSchema: z.object({
        multiplier: z.number(),
        approved: z.boolean(),
      }),
    }).andThen({
      id: "step-1",
      execute: async ({ data }) => ({
        finalValue: data.initialValue * 2,
      }),
    });

    // Test that the workflow execution result has proper resume type
    const workflowInstance = workflow.toWorkflow();
    type ExecutionResult = Awaited<ReturnType<typeof workflowInstance.run>>;
    type ResumeFunc = ExecutionResult["resume"];
    type ResumeParam = Parameters<ResumeFunc>[0];

    expectTypeOf<ResumeFunc>().toBeFunction();
    expectTypeOf<ResumeParam>().toEqualTypeOf<{
      multiplier: number;
      approved: boolean;
    }>();
  });

  it("should work with tap steps and preserve suspend type", () => {
    const workflow = createWorkflowChain({
      id: "tap-type-test",
      name: "Tap Type Test",
      purpose: "Test tap steps with suspend types",
      input: z.object({
        value: z.number(),
      }),
      result: z.object({
        logged: z.boolean(),
      }),
      suspendSchema: z.object({
        tapData: z.string(),
        stepId: z.string(),
      }),
    })
      .andTap({
        id: "log-step",
        execute: async ({ data, suspend }) => {
          // Tap steps should also have typed suspend
          await suspend("tap suspend", {
            tapData: `Value: ${data.value}`,
            stepId: "log-step",
          });
        },
      })
      .andThen({
        id: "final-step",
        execute: async () => ({
          logged: true,
        }),
      });

    expectTypeOf(workflow).not.toBeNever();
  });

  it("should default to empty object when no suspend/resume schemas provided", () => {
    const workflow = createWorkflowChain({
      id: "no-schema-test",
      name: "No Schema Test",
      purpose: "Test default suspend/resume types",
      input: z.object({
        value: z.number(),
      }),
      result: z.object({
        doubled: z.number(),
      }),
    }).andThen({
      id: "step-1",
      execute: async ({ data, suspend }) => {
        // Without schemas, suspend data should be empty object type
        // Can call with empty object or undefined
        await suspend("reason");
        await suspend("reason", {});

        return { doubled: data.value * 2 };
      },
    });

    const workflowInstance = workflow.toWorkflow();
    type ExecutionResult = Awaited<ReturnType<typeof workflowInstance.run>>;
    type ResumeParam = Parameters<ExecutionResult["resume"]>[0];

    // Resume should accept empty object
    expectTypeOf<ResumeParam>().toEqualTypeOf<{}>();
  });

  it("should type check context parameter correctly", () => {
    type TestContext = WorkflowExecuteContext<
      { value: number },
      { intermediate: string },
      { suspendField: boolean }
    >;

    expectTypeOf<TestContext["data"]>().toEqualTypeOf<{ intermediate: string }>();
    expectTypeOf<TestContext["suspend"]>().toBeFunction();

    type SuspendFunc = TestContext["suspend"];
    type SuspendDataParam = Parameters<SuspendFunc>[1];
    expectTypeOf<SuspendDataParam>().toEqualTypeOf<{ suspendField: boolean } | undefined>();

    expectTypeOf<TestContext["getStepData"]>().toBeFunction();
  });

  it("should preserve types through workflow chain transformations", () => {
    const workflow = createWorkflowChain({
      id: "chain-type-test",
      name: "Chain Type Test",
      purpose: "Test type preservation through chain",
      input: z.object({
        initial: z.string(),
      }),
      result: z.object({
        final: z.number(),
      }),
      suspendSchema: z.object({
        stage: z.enum(["start", "middle", "end"]),
        progress: z.number(),
      }),
    })
      .andThen({
        id: "transform-1",
        execute: async ({ data, suspend }) => {
          expectTypeOf(data).toEqualTypeOf<{ initial: string }>();

          // Test suspend type by using it
          await suspend("stage update", {
            stage: "start",
            progress: 0,
          });

          return {
            transformed: data.initial.length,
          };
        },
      })
      .andThen({
        id: "transform-2",
        execute: async ({ data, suspend }) => {
          // Data type should be updated from previous step
          expectTypeOf(data).toEqualTypeOf<{ transformed: number }>();

          // Suspend type should remain the same - test by using it
          await suspend("stage update", {
            stage: "end",
            progress: 100,
          });

          return {
            final: data.transformed * 2,
          };
        },
      });

    expectTypeOf(workflow).not.toBeNever();
  });

  it("should handle complex nested schemas", () => {
    const complexSuspendSchema = z.object({
      user: z.object({
        id: z.string(),
        name: z.string(),
        permissions: z.array(z.string()),
      }),
      metadata: z.object({
        timestamp: z.string(),
        source: z.enum(["api", "ui", "system"]),
        tags: z.record(z.string()),
      }),
      data: z.array(
        z.object({
          key: z.string(),
          value: z.unknown(),
        }),
      ),
    });

    const workflow = createWorkflowChain({
      id: "complex-type-test",
      name: "Complex Type Test",
      purpose: "Test complex nested schemas",
      input: z.object({
        request: z.string(),
      }),
      result: z.object({
        response: z.string(),
      }),
      suspendSchema: complexSuspendSchema,
    }).andThen({
      id: "complex-step",
      execute: async ({ suspend }) => {
        // Should have full type inference for complex nested structure
        await suspend("Complex suspend", {
          user: {
            id: "123",
            name: "Test User",
            permissions: ["read", "write"],
          },
          metadata: {
            timestamp: new Date().toISOString(),
            source: "api",
            tags: { env: "test", version: "1.0" },
          },
          data: [
            { key: "field1", value: 42 },
            { key: "field2", value: { nested: true } },
          ],
        });

        return { response: "processed" };
      },
    });

    expectTypeOf(workflow).not.toBeNever();
  });
});

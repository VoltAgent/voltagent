import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createTestLibSQLStorage } from "../test-utils/libsql-test-helpers";
import { createWorkflow } from "./core";
import { WorkflowRegistry } from "./registry";
import { andAll, andThen, andWhen } from "./steps";
import { createSuspendController } from "./suspend-controller";

describe.sequential("workflow suspend/resume functionality", () => {
  let registry: WorkflowRegistry;

  beforeEach(() => {
    // Clear registry before each test
    registry = WorkflowRegistry.getInstance();
    (registry as any).workflows.clear();
    (registry as any).workflowHistoryManagers.clear();
  });

  it("should suspend workflow when abort signal is triggered", async () => {
    const memory = createTestLibSQLStorage("suspend_abort_signal");

    const workflow = createWorkflow(
      {
        id: "test-suspend",
        name: "Test Suspend Workflow",
        result: z.object({ result: z.string() }),
        memory,
      },
      andThen({
        id: "step-1",
        name: "Step 1",
        execute: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return { step1: "completed" };
        },
      }),
      andThen({
        id: "step-2",
        name: "Step 2",
        execute: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return { step2: "completed" };
        },
      }),
      andThen({
        id: "step-3",
        name: "Step 3",
        execute: async () => {
          return { result: "all done" };
        },
      }),
    );

    registry.registerWorkflow(workflow);

    // Create suspend controller using new helper
    const controller = createSuspendController();

    // Start workflow - only need to pass suspendController now
    const runPromise = workflow.run("test input", {
      suspendController: controller,
    });

    // Suspend after 50ms (during step 1)
    setTimeout(() => {
      controller.suspend("Test suspension");
    }, 50);

    const result = await runPromise;

    expect(result.status).toBe("suspended");
    expect(result.suspension).toBeDefined();
    expect(result.suspension?.reason).toBe("Test suspension");
    expect(result.suspension?.suspendedStepIndex).toBe(0); // During Step 1
    expect(result.result).toBeNull();
  });

  it("should resume suspended workflow from correct step", async () => {
    const stepExecutions: string[] = [];
    const memory = createTestLibSQLStorage("resume_workflow");

    const workflow = createWorkflow(
      {
        id: "test-resume",
        name: "Test Resume Workflow",
        result: z.object({
          steps: z.array(z.string()),
          finalResult: z.string(),
        }),
        memory,
      },
      andThen({
        id: "step-1",
        name: "Step 1",
        execute: async () => {
          stepExecutions.push("step1");
          await new Promise((resolve) => setTimeout(resolve, 150));
          return { data: "step1-data" };
        },
      }),
      andThen({
        id: "step-2",
        name: "Step 2",
        execute: async () => {
          stepExecutions.push("step2");
          await new Promise((resolve) => setTimeout(resolve, 150));
          return { data: "step2-data" };
        },
      }),
      andThen({
        id: "step-3",
        name: "Step 3",
        execute: async (context: any) => {
          stepExecutions.push("step3");
          return {
            steps: stepExecutions,
            finalResult: `Completed with ${context.data.data}`,
          };
        },
      }),
    );

    registry.registerWorkflow(workflow);

    // First run with suspension
    const controller = createSuspendController();
    const runPromise = workflow.run("initial input", {
      suspendController: controller,
    });

    // Suspend after step 1
    setTimeout(() => {
      controller.suspend("Suspend after step 1");
    }, 50);

    const suspendedResult = await runPromise;
    expect(suspendedResult.status).toBe("suspended");
    expect(stepExecutions).toEqual(["step1"]);

    // Wait for persistence
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Resume workflow
    const resumedResult = await registry.resumeSuspendedWorkflow(
      workflow.id,
      suspendedResult.executionId,
    );

    expect(resumedResult?.status).toBe("completed");
    expect(resumedResult?.result).toBeDefined();
    expect(resumedResult?.result.steps).toEqual(["step1", "step1", "step2", "step3"]);
    expect(resumedResult?.result.finalResult).toBe("Completed with step2-data");
  });

  it("should preserve workflow state across suspend/resume", async () => {
    let capturedState: any = null;
    const memory = createTestLibSQLStorage("preserve_state");

    const workflow = createWorkflow(
      {
        id: "test-state-preservation",
        name: "Test State Preservation",
        result: z.object({
          accumulated: z.array(z.string()),
          sum: z.number(),
        }),
        memory,
      },
      andThen({
        id: "accumulate-1",
        name: "Accumulate 1",
        execute: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return { accumulated: ["first"], sum: 10 };
        },
      }),
      andThen({
        id: "accumulate-2",
        name: "Accumulate 2",
        execute: async (context: any) => {
          capturedState = context.data;
          return {
            accumulated: [...context.data.accumulated, "second"],
            sum: context.data.sum + 20,
          };
        },
      }),
      andThen({
        id: "accumulate-3",
        name: "Accumulate 3",
        execute: async (context: any) => {
          return {
            accumulated: [...context.data.accumulated, "third"],
            sum: context.data.sum + 30,
          };
        },
      }),
    );

    registry.registerWorkflow(workflow);

    // Run with suspension after step 1
    const controller = createSuspendController();
    const runPromise = workflow.run("test", {
      suspendController: controller,
    });

    setTimeout(() => {
      controller?.suspend("Suspend for testing");
    }, 50);

    const suspended = await runPromise;
    expect(suspended.status).toBe("suspended");

    // State should not be captured yet (step 2 not executed)
    expect(capturedState).toBeNull();

    // Resume and complete
    const resumed = await registry.resumeSuspendedWorkflow(workflow.id, suspended.executionId);

    // Now state should be captured with data from step 1
    expect(capturedState).toEqual({
      accumulated: ["first"],
      sum: 10,
    });

    expect(resumed?.result).toEqual({
      accumulated: ["first", "second", "third"],
      sum: 60,
    });
  });

  it("should handle suspension during parallel steps", async () => {
    const memory = createTestLibSQLStorage("parallel_suspend");

    const workflow = createWorkflow(
      {
        id: "test-parallel-suspend",
        name: "Test Parallel Suspend",
        result: z.object({ results: z.array(z.string()) }),
        memory,
      },
      andAll({
        id: "parallel-steps",
        name: "Parallel Steps",
        steps: [
          andThen({
            id: "parallel-1",
            name: "Parallel 1",
            execute: async () => {
              await new Promise((resolve) => setTimeout(resolve, 200));
              return "result1";
            },
          }),
          andThen({
            id: "parallel-2",
            name: "Parallel 2",
            execute: async () => {
              await new Promise((resolve) => setTimeout(resolve, 300));
              return "result2";
            },
          }),
        ],
      }),
      andThen({
        id: "final",
        name: "Final",
        execute: async (results: any) => {
          return { results };
        },
      }),
    );

    registry.registerWorkflow(workflow);

    const controller = createSuspendController();
    const runPromise = workflow.run("test", {
      suspendController: controller,
    });

    // Suspend during parallel execution
    setTimeout(() => {
      controller?.suspend("Suspend during parallel");
    }, 150);

    const suspended = await runPromise;
    expect(suspended.status).toBe("suspended");
    expect(suspended.suspension?.suspendedStepIndex).toBe(0);
  });

  it("should handle suspension during conditional steps", async () => {
    let conditionChecked = false;
    let conditionalExecuted = false;
    const memory = createTestLibSQLStorage("conditional_suspend");

    const workflow = createWorkflow(
      {
        id: "test-conditional-suspend",
        name: "Test Conditional Suspend",
        result: z.object({ executed: z.boolean() }),
        memory,
      },
      andWhen({
        id: "check-condition",
        name: "Check Condition",
        condition: async () => {
          conditionChecked = true;
          return true;
        },
        step: andThen({
          id: "conditional-step",
          name: "Conditional Step",
          execute: async () => {
            conditionalExecuted = true;
            await new Promise((resolve) => setTimeout(resolve, 100));
            return { conditionalResult: "done" };
          },
        }),
      }),
      andThen({
        id: "final",
        name: "Final",
        execute: async () => {
          return { executed: conditionalExecuted };
        },
      }),
    );

    registry.registerWorkflow(workflow);

    const controller = createSuspendController();
    const runPromise = workflow.run("test", {
      suspendController: controller,
    });

    // Suspend during conditional step
    setTimeout(() => {
      controller?.suspend("Suspend in conditional");
    }, 50);

    const suspended = await runPromise;
    expect(suspended.status).toBe("suspended");
    expect(conditionChecked).toBe(true);
    expect(conditionalExecuted).toBe(true); // Started but suspended

    // Resume
    const resumed = await registry.resumeSuspendedWorkflow(workflow.id, suspended.executionId);

    expect(resumed?.result.executed).toBe(true);
  });

  it("should list all suspended workflows", async () => {
    const memory = createTestLibSQLStorage("list_suspended");

    const workflow1 = createWorkflow(
      {
        id: "suspended-1",
        name: "Suspended Workflow 1",
        result: z.string(),
        memory,
      },
      andThen({
        id: "step-1",
        name: "Step 1",
        execute: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return "step1";
        },
      }),
      andThen({
        id: "step-2",
        name: "Step 2",
        execute: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return "done";
        },
      }),
    );

    const workflow2 = createWorkflow(
      {
        id: "suspended-2",
        name: "Suspended Workflow 2",
        result: z.string(),
        memory,
      },
      andThen({
        id: "step-1",
        name: "Step 1",
        execute: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return "step1";
        },
      }),
      andThen({
        id: "step-2",
        name: "Step 2",
        execute: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return "done";
        },
      }),
    );

    registry.registerWorkflow(workflow1);
    registry.registerWorkflow(workflow2);

    // Suspend both workflows
    const controller1 = workflow1.createSuspendController?.();
    const controller2 = workflow2.createSuspendController?.();

    const run1 = workflow1.run("test1", {
      suspendController: controller1,
    });
    const run2 = workflow2.run("test2", {
      suspendController: controller2,
    });

    setTimeout(() => {
      controller1.suspend("Suspend 1");
      controller2.suspend("Suspend 2");
    }, 50);

    const [result1, result2] = await Promise.all([run1, run2]);

    // Check if workflows were actually suspended
    expect(result1.status).toBe("suspended");
    expect(result2.status).toBe("suspended");

    // Wait for persistence
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Get all suspended workflows
    const suspendedList = await registry.getSuspendedWorkflows();

    expect(suspendedList).toHaveLength(2);
    expect(suspendedList.map((s) => s.workflowId).sort()).toEqual(["suspended-1", "suspended-2"]);
    expect(suspendedList[0].reason).toBeDefined();
    expect(suspendedList[0].suspendedStepIndex).toBe(0);
  });

  it("should handle resume with no suspension metadata gracefully", async () => {
    const memory = createTestLibSQLStorage("no_metadata");

    const workflow = createWorkflow(
      {
        id: "test-no-metadata",
        name: "Test No Metadata",
        result: z.string(),
        memory,
      },
      andThen({
        id: "step",
        name: "Step",
        execute: async () => "done",
      }),
    );

    registry.registerWorkflow(workflow);

    // Try to resume non-existent execution
    await expect(registry.resumeSuspendedWorkflow(workflow.id, "non-existent-id")).rejects.toThrow(
      "Execution not found",
    );
  });

  it("should not allow resuming non-suspended workflow", async () => {
    const memory = createTestLibSQLStorage("non_suspended");

    const workflow = createWorkflow(
      {
        id: "test-completed",
        name: "Test Completed",
        result: z.string(),
        memory,
      },
      andThen({
        id: "step",
        name: "Step",
        execute: async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return "done";
        },
      }),
    );

    registry.registerWorkflow(workflow);

    // Run to completion without suspension
    const result = await workflow.run("test");
    expect(result.status).toBe("completed");

    // Wait a bit to ensure the workflow is saved to memory
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Try to resume completed workflow
    try {
      await registry.resumeSuspendedWorkflow(workflow.id, result.executionId);
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      // We expect either "Execution not found" or "not in suspended state"
      // depending on whether the execution was persisted
      expect(
        error.message.includes("not in suspended state") ||
          error.message.includes("Execution not found"),
      ).toBe(true);
    }
  });

  it("should handle suspension checkpoint data correctly", async () => {
    const memory = createTestLibSQLStorage("checkpoint");

    const workflow = createWorkflow(
      {
        id: "test-checkpoint",
        name: "Test Checkpoint",
        result: z.object({
          checkpoint: z.any(),
          final: z.string(),
        }),
        memory,
      },
      andThen({
        id: "step-1",
        name: "Step 1",
        execute: async () => ({ step1: "data1" }),
      }),
      andThen({
        id: "step-2",
        name: "Step 2",
        execute: async () => ({ step2: "data2" }),
      }),
      andThen({
        id: "step-3",
        name: "Step 3",
        execute: async (data: any) => ({
          checkpoint: data,
          final: "done",
        }),
      }),
    );

    registry.registerWorkflow(workflow);

    const controller = createSuspendController();
    const runPromise = workflow.run("test", {
      suspendController: controller,
    });

    // Suspend after step 1
    setTimeout(() => {
      controller?.suspend("Test checkpoint");
    }, 50);

    const suspended = await runPromise;

    // Check if it was suspended
    if (suspended.status === "suspended") {
      expect(suspended.suspension?.checkpoint).toBeDefined();
      expect(suspended.suspension?.checkpoint?.completedStepsData).toHaveLength(0);
    } else {
      return;
    }

    // Resume and verify checkpoint was used
    const resumed = await registry.resumeSuspendedWorkflow(workflow.id, suspended.executionId);

    expect(resumed?.result.checkpoint).toEqual({ step2: "data2" });
  });

  it("should allow suspending from within step execution via context", async () => {
    const memory = createTestLibSQLStorage("suspend_api");

    const workflow = createWorkflow(
      {
        id: "test-suspend-api",
        name: "Test Suspend API",
        result: z.object({ result: z.string() }),
        memory,
      },
      andThen({
        id: "step-1",
        name: "Step 1",
        execute: async ({ suspend }) => {
          // Suspend the workflow from within the step
          await suspend("User approval required", {
            customData: "test-metadata",
          });
          return { result: "should not reach here" };
        },
      }),
    );

    registry.registerWorkflow(workflow);

    // Create suspend controller
    const controller = workflow.createSuspendController?.();
    expect(controller).toBeDefined();

    // Run workflow
    const result = await workflow.run("test input", {
      suspendController: controller,
    });

    // Verify workflow was suspended
    expect(result.status).toBe("suspended");
    expect(result.suspension?.reason).toBe("User approval required");
    expect(result.result).toBeNull();

    // Verify resume function exists
    expect(result.resume).toBeDefined();
    expect(typeof result.resume).toBe("function");
  });

  it("should provide a working resume function on the execution result", async () => {
    let stepExecutions = 0;
    const memory = createTestLibSQLStorage("resume_api");

    const workflow = createWorkflow(
      {
        id: "test-resume-api",
        name: "Test Resume API",
        result: z.object({ count: z.number() }),
        memory,
      },
      andThen({
        id: "step-1",
        name: "Step 1",
        execute: async ({ suspend }) => {
          stepExecutions++;
          if (stepExecutions === 1) {
            await suspend("Pause for testing");
          }
          return { count: stepExecutions };
        },
      }),
    );

    registry.registerWorkflow(workflow);

    const controller = createSuspendController();
    const result = await workflow.run("test", {
      suspendController: controller,
    });

    expect(result.status).toBe("suspended");
    expect(stepExecutions).toBe(1);

    // Wait for persistence
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Use the resume function directly from the result
    const resumedResult = await result.resume();

    expect(resumedResult.status).toBe("completed");
    expect(resumedResult.result?.count).toBe(2);
    expect(stepExecutions).toBe(2);
  });

  it("should work correctly in distributed scenario with stateless resume", async () => {
    // This test simulates a distributed scenario where resume happens
    // on a different "instance" (simulated by getting fresh registry reference)

    let executionCount = 0;
    const memory = createTestLibSQLStorage("distributed");

    const workflow = createWorkflow(
      {
        id: "test-distributed",
        name: "Test Distributed",
        result: z.string(),
        memory,
      },
      andThen({
        id: "step",
        execute: async ({ suspend }) => {
          executionCount++;
          if (executionCount === 1) {
            await suspend("Distributed test");
          }
          return "resumed successfully";
        },
      }),
    );

    registry.registerWorkflow(workflow);

    const controller = createSuspendController();
    const result = await workflow.run("test", {
      suspendController: controller,
    });

    expect(result.status).toBe("suspended");

    // Wait for persistence
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate getting the result on a different server
    // The resume function should still work because it uses the registry
    const simulatedDistributedResult = {
      ...result,
      resume: result.resume, // This closure only captures IDs, not the workflow instance
    };

    // Resume should work even with this "distributed" result
    const resumed = await simulatedDistributedResult.resume();
    expect(resumed.status).toBe("completed");
    expect(resumed.result).toBe("resumed successfully");
  });
});

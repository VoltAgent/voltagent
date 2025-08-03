import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createTestLibSQLStorage } from "../test-utils/libsql-test-helpers";
import { createWorkflow } from "./core";
import { WorkflowRegistry } from "./registry";
import { createScheduler } from "./scheduler";
import { andThen } from "./steps";

// Mock the scheduler module
vi.mock("./scheduler", () => ({
  createScheduler: vi.fn(),
}));

describe.sequential("workflow.run", () => {
  beforeEach(() => {
    // Clear registry before each test
    const registry = WorkflowRegistry.getInstance();
    (registry as any).workflows.clear();
  });

  it("should return the expected result", async () => {
    const memory = createTestLibSQLStorage("workflow_run");

    const workflow = createWorkflow(
      {
        id: "test",
        name: "test",
        input: z.object({
          name: z.string(),
        }),
        result: z.object({
          name: z.string(),
        }),
        memory,
      },
      andThen({
        id: "step-1-join-name",
        name: "Join with john",
        execute: async ({ data }) => {
          return {
            name: [data.name, "john"].join(" "),
            foo: "bar",
          };
        },
      }),
      andThen({
        id: "step-2-add-surname",
        name: "Add surname",
        execute: async ({ data }) => {
          return {
            name: [data.name, "doe"].join(" "),
          };
        },
      }),
    );

    // Register workflow to registry
    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const result = await workflow.run({
      name: "Who is",
    });

    expect(result).toEqual({
      executionId: expect.any(String),
      workflowId: "test",
      startAt: expect.any(Date),
      endAt: expect.any(Date),
      status: "completed",
      result: {
        name: "Who is john doe",
      },
      suspension: undefined,
      error: undefined,
      resume: expect.any(Function),
    });
  });
});

describe.sequential("workflow.scheduledRun", () => {
  const mockCreateScheduler = vi.mocked(createScheduler);
  const mockScheduler = {
    start: vi.fn(),
    stop: vi.fn(),
    destroy: vi.fn(),
  };

  beforeEach(() => {
    // Clear registry before each test
    const registry = WorkflowRegistry.getInstance();
    (registry as any).workflows.clear();

    // Reset mocks
    vi.clearAllMocks();
    mockCreateScheduler.mockReturnValue(mockScheduler as any);
  });

  it("should create and start a scheduler when schedule expression is provided", async () => {
    const memory = createTestLibSQLStorage("workflow_scheduled_run");

    const workflow = createWorkflow(
      {
        id: "test-scheduled",
        name: "test scheduled workflow",
        input: z.object({
          name: z.string(),
        }),
        result: z.object({
          name: z.string(),
        }),
        memory,
      },
      andThen({
        id: "step-1-scheduled",
        name: "Scheduled step",
        execute: async ({ data }) => {
          return {
            name: `Scheduled: ${data.name}`,
          };
        },
      }),
    );

    const input = { name: "test" };
    const onResultMock = vi.fn();
    const scheduleOptions = {
      schedule: {
        expression: "0 30 14 * * *", // Every day at 2:30 PM
        onResult: onResultMock,
        options: { timezone: "UTC", maxExecutions: 10 },
      },
    };

    // Register workflow to registry (required for scheduled execution)
    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const result = await workflow.scheduledRun(input, scheduleOptions);

    // Verify createScheduler was called with correct parameters
    expect(mockCreateScheduler).toHaveBeenCalledWith({
      expression: "0 30 14 * * *",
      callback: expect.any(Function),
      onResult: expect.any(Function),
      options: { timezone: "UTC", maxExecutions: 10 },
    });

    // Verify scheduler.start() was called
    expect(mockScheduler.start).toHaveBeenCalled();

    // Test that the onResult callback would be called by simulating scheduler execution
    const schedulerCallArgs = mockCreateScheduler.mock.calls[0][0];
    const schedulerCallback = schedulerCallArgs.callback;
    const schedulerOnResult = schedulerCallArgs.onResult;

    // Ensure callbacks are defined
    expect(schedulerCallback).toBeDefined();
    expect(schedulerOnResult).toBeDefined();

    // Simulate the scheduler running the callback
    const workflowResult = await schedulerCallback();
    schedulerOnResult?.(workflowResult);

    // Now verify onResult was called with the correct result
    expect(onResultMock).toHaveBeenCalledWith(workflowResult);

    // Verify the scheduler is returned
    expect(result).toBe(mockScheduler);
  });

  it("should throw error when no schedule is provided", async () => {
    const memory = createTestLibSQLStorage("workflow_no_schedule");

    const workflow = createWorkflow(
      {
        id: "test-no-schedule",
        name: "test no schedule workflow",
        input: z.object({
          name: z.string(),
        }),
        result: z.object({
          name: z.string(),
        }),
        memory,
      },
      andThen({
        id: "step-1-no-schedule",
        name: "No schedule step",
        execute: async ({ data }) => {
          return {
            name: `No schedule: ${data.name}`,
          };
        },
      }),
    );

    const input = { name: "test" };

    // Verify error is thrown when no schedule is provided
    await expect((workflow.scheduledRun as any)(input)).rejects.toThrow(
      "Schedule expression is required",
    );

    // Verify createScheduler was not called
    expect(mockCreateScheduler).not.toHaveBeenCalled();
  });

  it("should throw error when schedule object is provided but expression is missing", async () => {
    const memory = createTestLibSQLStorage("workflow_no_expression");

    const workflow = createWorkflow(
      {
        id: "test-no-expression",
        name: "test no expression workflow",
        input: z.object({
          name: z.string(),
        }),
        result: z.object({
          name: z.string(),
        }),
        memory,
      },
      andThen({
        id: "step-1-no-expression",
        name: "No expression step",
        execute: async ({ data }) => {
          return {
            name: `No expression: ${data.name}`,
          };
        },
      }),
    );

    const input = { name: "test" };
    const scheduleOptions = {
      schedule: {
        onResult: vi.fn(),
      },
    };

    // Verify error is thrown when expression is missing
    await expect(workflow.scheduledRun(input, scheduleOptions as any)).rejects.toThrow(
      "Schedule expression is required",
    );

    // Verify createScheduler was not called
    expect(mockCreateScheduler).not.toHaveBeenCalled();
  });

  it("should throw error when expression is empty string", async () => {
    const memory = createTestLibSQLStorage("workflow_empty_expression");

    const workflow = createWorkflow(
      {
        id: "test-empty-expression",
        name: "test empty expression workflow",
        input: z.object({
          name: z.string(),
        }),
        result: z.object({
          name: z.string(),
        }),
        memory,
      },
      andThen({
        id: "step-1-empty-expression",
        name: "Empty expression step",
        execute: async ({ data }) => {
          return {
            name: `Empty expression: ${data.name}`,
          };
        },
      }),
    );

    const input = { name: "test" };
    const scheduleOptions = {
      schedule: {
        expression: "",
        onResult: vi.fn(),
      },
    };

    // Verify error is thrown when expression is empty string
    await expect(workflow.scheduledRun(input, scheduleOptions)).rejects.toThrow(
      "Schedule expression is required",
    );

    // Verify createScheduler was not called
    expect(mockCreateScheduler).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { Memory } from "../memory";
import { InMemoryStorageAdapter } from "../memory/adapters/storage/in-memory";
import { createWorkflow } from "./core";
import { WorkflowRegistry } from "./registry";
import { andThen } from "./steps";

describe.sequential("workflow.timeTravel", () => {
  beforeEach(() => {
    const registry = WorkflowRegistry.getInstance();
    (registry as any).workflows.clear();
  });

  it("should replay from middle step with a new execution id", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });
    const counters = { step1: 0, step2: 0, step3: 0 };

    const workflow = createWorkflow(
      {
        id: "time-travel-middle-step",
        name: "Time Travel Middle Step",
        input: z.object({ value: z.number() }),
        result: z.object({ result: z.number() }),
        memory,
      },
      andThen({
        id: "step-1",
        execute: async ({ data }) => {
          counters.step1 += 1;
          return { value: data.value + 1 };
        },
      }),
      andThen({
        id: "step-2",
        execute: async ({ data }) => {
          counters.step2 += 1;
          return { value: data.value * 2 };
        },
      }),
      andThen({
        id: "step-3",
        execute: async ({ data }) => {
          counters.step3 += 1;
          return { result: data.value + 3 };
        },
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const original = await workflow.run({ value: 1 });
    expect(original.status).toBe("completed");
    expect(original.result).toEqual({ result: 7 });
    expect(counters).toEqual({ step1: 1, step2: 1, step3: 1 });

    const replay = await workflow.timeTravel({
      executionId: original.executionId,
      stepId: "step-2",
    });

    expect(replay.status).toBe("completed");
    expect(replay.result).toEqual({ result: 7 });
    expect(replay.executionId).not.toBe(original.executionId);
    expect(counters).toEqual({ step1: 1, step2: 2, step3: 2 });

    const originalState = await memory.getWorkflowState(original.executionId);
    const replayState = await memory.getWorkflowState(replay.executionId);

    expect(originalState?.status).toBe("completed");
    expect(originalState?.output).toEqual({ result: 7 });
    expect(originalState?.replayedFromExecutionId).toBeUndefined();
    expect(originalState?.replayFromStepId).toBeUndefined();

    expect(replayState?.status).toBe("completed");
    expect(replayState?.replayedFromExecutionId).toBe(original.executionId);
    expect(replayState?.replayFromStepId).toBe("step-2");
  });

  it("should apply inputData override only to replay run", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });

    const workflow = createWorkflow(
      {
        id: "time-travel-input-override",
        name: "Time Travel Input Override",
        input: z.object({ value: z.number() }),
        result: z.object({ result: z.number() }),
        memory,
      },
      andThen({
        id: "step-1",
        execute: async ({ data }) => ({ value: data.value + 1 }),
      }),
      andThen({
        id: "step-2",
        execute: async ({ data }) => ({ value: data.value * 2 }),
      }),
      andThen({
        id: "step-3",
        execute: async ({ data }) => ({ result: data.value + 3 }),
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const original = await workflow.run({ value: 1 });
    expect(original.result).toEqual({ result: 7 });

    const replay = await workflow.timeTravel({
      executionId: original.executionId,
      stepId: "step-2",
      inputData: { value: 100 },
    });

    expect(replay.status).toBe("completed");
    expect(replay.result).toEqual({ result: 203 });

    const originalState = await memory.getWorkflowState(original.executionId);
    expect(originalState?.output).toEqual({ result: 7 });
  });

  it("should fail with actionable error when step does not exist", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });

    const workflow = createWorkflow(
      {
        id: "time-travel-invalid-step",
        name: "Time Travel Invalid Step",
        input: z.object({ value: z.number() }),
        result: z.object({ value: z.number() }),
        memory,
      },
      andThen({
        id: "step-1",
        execute: async ({ data }) => data,
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const original = await workflow.run({ value: 1 });
    await expect(
      workflow.timeTravel({
        executionId: original.executionId,
        stepId: "missing-step",
      }),
    ).rejects.toThrow("Step 'missing-step' not found");
  });

  it("should reject time travel when source execution is still running", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });
    const runningExecutionId = "exec-running-time-travel";

    const workflow = createWorkflow(
      {
        id: "time-travel-running-source",
        name: "Time Travel Running Source",
        input: z.object({ value: z.number() }),
        result: z.object({ value: z.number() }),
        memory,
      },
      andThen({
        id: "step-1",
        execute: async ({ data }) => data,
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const now = new Date();
    await memory.setWorkflowState(runningExecutionId, {
      id: runningExecutionId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: "running",
      input: { value: 1 },
      createdAt: now,
      updatedAt: now,
    });

    await expect(
      workflow.timeTravel({
        executionId: runningExecutionId,
        stepId: "step-1",
      }),
    ).rejects.toThrow("running");
  });

  it("should fail with actionable error when execution does not exist", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });

    const workflow = createWorkflow(
      {
        id: "time-travel-missing-execution",
        name: "Time Travel Missing Execution",
        input: z.object({ value: z.number() }),
        result: z.object({ value: z.number() }),
        memory,
      },
      andThen({
        id: "step-1",
        execute: async ({ data }) => data,
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    await expect(
      workflow.timeTravel({
        executionId: "exec-missing-time-travel",
        stepId: "step-1",
      }),
    ).rejects.toThrow("Workflow state not found");
  });

  it("should keep original execution history unchanged after replay", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });

    const workflow = createWorkflow(
      {
        id: "time-travel-history-integrity",
        name: "Time Travel History Integrity",
        input: z.object({ value: z.number() }),
        result: z.object({ result: z.number() }),
        memory,
      },
      andThen({
        id: "step-1",
        execute: async ({ data }) => ({ value: data.value + 1 }),
      }),
      andThen({
        id: "step-2",
        execute: async ({ data }) => ({ result: data.value + 5 }),
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const original = await workflow.run({ value: 3 });
    const originalBeforeReplay = await memory.getWorkflowState(original.executionId);

    await workflow.timeTravel({
      executionId: original.executionId,
      stepId: "step-2",
    });

    const originalAfterReplay = await memory.getWorkflowState(original.executionId);
    expect(originalAfterReplay?.status).toBe("completed");
    expect(originalAfterReplay?.output).toEqual(originalBeforeReplay?.output);
    expect(originalAfterReplay?.updatedAt).toEqual(originalBeforeReplay?.updatedAt);
    expect(originalAfterReplay?.replayedFromExecutionId).toBeUndefined();
    expect(originalAfterReplay?.replayFromStepId).toBeUndefined();
  });

  it("should emit workflow stream events during replay streaming", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });

    const workflow = createWorkflow(
      {
        id: "time-travel-stream",
        name: "Time Travel Stream",
        input: z.object({ value: z.number() }),
        result: z.object({ result: z.number() }),
        memory,
      },
      andThen({
        id: "step-1",
        execute: async ({ data }) => ({ value: data.value + 1 }),
      }),
      andThen({
        id: "step-2",
        execute: async ({ data }) => ({ value: data.value * 2 }),
      }),
      andThen({
        id: "step-3",
        execute: async ({ data }) => ({ result: data.value + 3 }),
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const original = await workflow.run({ value: 2 });

    const stream = workflow.timeTravelStream({
      executionId: original.executionId,
      stepId: "step-2",
    });

    const events: Array<{ type: string; from?: string }> = [];
    for await (const event of stream) {
      events.push({ type: event.type, from: event.from });
    }

    const replayResult = await stream.result;
    expect(replayResult).toEqual({ result: 9 });

    const eventTypes = events.map((event) => event.type);
    expect(eventTypes).toContain("workflow-start");
    expect(eventTypes).toContain("step-start");
    expect(eventTypes).toContain("step-complete");
    expect(eventTypes).toContain("workflow-complete");

    const startedSteps = events
      .filter((event) => event.type === "step-start")
      .map((event) => event.from);
    expect(startedSteps).toContain("step-2");
    expect(startedSteps).toContain("step-3");
    expect(startedSteps).not.toContain("step-1");
  });
});

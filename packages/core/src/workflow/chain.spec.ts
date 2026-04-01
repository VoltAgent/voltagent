import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { Memory } from "../memory";
import { InMemoryStorageAdapter } from "../memory/adapters/storage/in-memory";
import { createWorkflowChain } from "./chain";
import { WorkflowRegistry } from "./registry";
import { andThen } from "./steps";

describe.sequential("workflow.run", () => {
  beforeEach(() => {
    // Clear registry before each test
    const registry = WorkflowRegistry.getInstance();
    (registry as any).workflows.clear();
  });

  it("should return the expected result", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });

    const workflow = createWorkflowChain({
      id: "test",
      name: "test",
      input: z.object({
        name: z.string(),
      }),
      result: z.object({
        name: z.string(),
      }),
      memory,
    })
      .andThen({
        id: "step-1-join-name",
        name: "Join with john",
        execute: async ({ data }) => {
          return {
            name: [data.name, "john"].join(" "),
          };
        },
      })
      .andThen({
        id: "step-2-add-surname",
        name: "Add surname",
        execute: async ({ data }) => {
          return {
            name: [data.name, "doe"].join(" "),
          };
        },
      });

    // Register workflow to registry
    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow.toWorkflow());

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
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      suspension: undefined,
      error: undefined,
      resume: expect.any(Function),
    });
  });
});

describe.sequential("workflow.startAsync", () => {
  beforeEach(() => {
    const registry = WorkflowRegistry.getInstance();
    (registry as any).workflows.clear();
  });

  it("should start chain workflow execution in background", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });

    const workflow = createWorkflowChain({
      id: "chain-start-async",
      name: "Chain Start Async",
      input: z.object({ value: z.number() }),
      result: z.object({ result: z.number() }),
      memory,
    }).andThen({
      id: "double",
      execute: async ({ data }) => ({ result: data.value * 2 }),
    });

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow.toWorkflow());

    const startResult = await workflow.startAsync({ value: 10 });

    expect(startResult).toEqual({
      executionId: expect.any(String),
      workflowId: "chain-start-async",
      startAt: expect.any(Date),
    });

    let state = await memory.getWorkflowState(startResult.executionId);
    for (let i = 0; i < 100 && state?.status !== "completed"; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      state = await memory.getWorkflowState(startResult.executionId);
    }

    expect(state?.status).toBe("completed");
    expect(state?.output).toEqual({ result: 20 });
  });
});

describe.sequential("workflow.restart", () => {
  beforeEach(() => {
    const registry = WorkflowRegistry.getInstance();
    (registry as any).workflows.clear();
  });

  it("should restart running executions through the chain API", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });

    const workflow = createWorkflowChain({
      id: "chain-restart",
      name: "Chain Restart",
      input: z.object({ value: z.number() }),
      result: z.object({ value: z.number() }),
      memory,
    }).andThen({
      id: "echo",
      execute: async ({ data }) => data,
    });

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow.toWorkflow());

    const now = new Date();
    await memory.setWorkflowState("chain-restart-exec", {
      id: "chain-restart-exec",
      workflowId: "chain-restart",
      workflowName: "Chain Restart",
      status: "running",
      input: { value: 12 },
      createdAt: now,
      updatedAt: now,
    });

    const restarted = await workflow.restart("chain-restart-exec");
    expect(restarted.status).toBe("completed");
    expect(restarted.result).toEqual({ value: 12 });
  });

  it("should restart all active executions through the chain API", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });

    const workflow = createWorkflowChain({
      id: "chain-restart",
      name: "Chain Restart",
      input: z.object({ value: z.number() }),
      result: z.object({ value: z.number() }),
      memory,
    }).andThen({
      id: "echo",
      execute: async ({ data }) => data,
    });

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow.toWorkflow());

    const now = new Date();
    await memory.setWorkflowState("chain-restart-all-exec", {
      id: "chain-restart-all-exec",
      workflowId: "chain-restart",
      workflowName: "Chain Restart",
      status: "running",
      input: { value: 12 },
      createdAt: now,
      updatedAt: now,
    });

    const summary = await workflow.restartAllActive();
    expect(summary.restarted).toContain("chain-restart-all-exec");
    expect(summary.failed).toEqual([]);

    const restartedState = await memory.getWorkflowState("chain-restart-all-exec");
    expect(restartedState?.status).toBe("completed");
    expect(restartedState?.output).toEqual({ value: 12 });
  });
});

describe.sequential("workflow writer API", () => {
  beforeEach(() => {
    const registry = WorkflowRegistry.getInstance();
    (registry as any).workflows.clear();
  });

  it("should provide writer in andThen context", async () => {
    let writerAvailable = false;
    let customEventEmitted = false;
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });

    const workflow = createWorkflowChain({
      id: "writer-test",
      name: "Writer Test",
      input: z.object({ value: z.number() }),
      result: z.object({ result: z.number() }),
      memory,
    }).andThen({
      id: "check-writer",
      execute: async ({ data, writer }) => {
        writerAvailable = writer !== undefined && typeof writer.write === "function";

        if (writerAvailable) {
          writer.write({
            type: "custom-test-event",
            metadata: { test: true },
          });
          customEventEmitted = true;
        }

        return { result: data.value };
      },
    });

    // Register workflow to registry
    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow.toWorkflow());

    // Use stream() to capture events
    const stream = workflow.stream({ value: 10 });

    // Collect events
    const events = [];
    for await (const event of stream) {
      events.push(event);
    }

    // Wait for completion
    await stream.result;

    expect(writerAvailable).toBe(true);
    expect(customEventEmitted).toBe(true);

    const customEvent = events.find((e) => e.type === "custom-test-event");
    expect(customEvent).toBeDefined();
    expect(customEvent?.metadata).toEqual({ test: true });
  });

  it("should provide writer in andTap context", async () => {
    let tapWriterAvailable = false;
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });

    const workflow = createWorkflowChain({
      id: "tap-writer-test",
      name: "Tap Writer Test",
      input: z.object({ text: z.string() }),
      result: z.object({ text: z.string() }),
      memory,
    })
      .andTap({
        id: "tap-step",
        execute: async ({ data, writer }) => {
          tapWriterAvailable = writer !== undefined;
          writer.write({
            type: "tap-event",
            metadata: { tapped: data.text },
          });
        },
      })
      .andThen({
        id: "final",
        execute: async ({ data }) => data,
      });

    // Register workflow to registry
    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow.toWorkflow());

    // Use stream() to capture events
    const stream = workflow.stream({ text: "hello" });

    // Collect events
    const events = [];
    for await (const event of stream) {
      events.push(event);
    }

    // Wait for completion
    await stream.result;

    expect(tapWriterAvailable).toBe(true);

    const tapEvent = events.find((e) => e.type === "tap-event");
    expect(tapEvent?.metadata).toEqual({ tapped: "hello" });
  });

  it("should provide writer in andWhen context", async () => {
    let conditionWriterAvailable = false;
    let executeWriterAvailable = false;
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });

    const workflow = createWorkflowChain({
      id: "when-writer-test",
      name: "When Writer Test",
      input: z.object({ value: z.number() }),
      result: z.object({ result: z.number() }),
      memory,
    }).andWhen({
      id: "conditional",
      condition: async ({ data, writer }) => {
        conditionWriterAvailable = writer !== undefined;
        writer.write({ type: "condition-checked" });
        return data.value > 5;
      },
      step: andThen({
        id: "when-execute",
        execute: async ({ data, writer }) => {
          executeWriterAvailable = writer !== undefined;
          writer.write({ type: "condition-executed" });
          return { result: data.value * 2 };
        },
      }),
    });

    // Register workflow to registry
    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow.toWorkflow());

    // Use stream() to capture events
    const stream = workflow.stream({ value: 10 });

    // Collect events
    const events = [];
    for await (const event of stream) {
      events.push(event);
    }

    // Wait for result
    await stream.result;

    expect(conditionWriterAvailable).toBe(true);
    expect(executeWriterAvailable).toBe(true);

    expect(events.some((e) => e.type === "condition-checked")).toBe(true);
    expect(events.some((e) => e.type === "condition-executed")).toBe(true);
  });
});

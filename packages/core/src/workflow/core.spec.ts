import { Output, type UIMessageChunk } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createTestAgent } from "../agent/test-utils";
import { Memory } from "../memory";
import { InMemoryStorageAdapter } from "../memory/adapters/storage/in-memory";
import { AgentRegistry } from "../registries/agent-registry";
import { VOLTAGENT_RESTART_CHECKPOINT_KEY, createWorkflow } from "./core";
import { WorkflowRegistry } from "./registry";
import { andAgent, andThen } from "./steps";

describe.sequential("workflow.run", () => {
  beforeEach(() => {
    // Clear registry before each test
    const registry = WorkflowRegistry.getInstance();
    (registry as any).workflows.clear();
  });

  it("should return the expected result", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });

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

  it("should persist workflowState across steps", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });

    const workflow = createWorkflow(
      {
        id: "workflow-state",
        name: "Workflow State",
        input: z.object({
          name: z.string(),
        }),
        result: z.object({
          greeting: z.string(),
          plan: z.string(),
        }),
        memory,
      },
      andThen({
        id: "set-state",
        execute: async ({ data, setWorkflowState }) => {
          setWorkflowState((previous) => ({
            ...previous,
            userName: data.name,
          }));
          return data;
        },
      }),
      andThen({
        id: "read-state",
        execute: async ({ workflowState }) => {
          return {
            greeting: `hi ${workflowState.userName as string}`,
            plan: workflowState.plan as string,
          };
        },
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const result = await workflow.run(
      { name: "Ada" },
      {
        workflowState: {
          plan: "pro",
        },
      },
    );

    expect(result.result).toEqual({
      greeting: "hi Ada",
      plan: "pro",
    });
  });

  it("should initialize context and persist context mutations across steps", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });

    const workflow = createWorkflow(
      {
        id: "workflow-context-persistence",
        name: "Workflow Context Persistence",
        input: z.object({
          value: z.string(),
        }),
        result: z.object({
          keyCount: z.number(),
          hasNewKey: z.boolean(),
        }),
        memory,
      },
      andThen({
        id: "mutate-context",
        execute: async ({ data, state }) => {
          if (!state.context) {
            throw new Error("Expected workflow context to be initialized");
          }
          state.context.set("new_key", "new_value");
          return data;
        },
      }),
      andThen({
        id: "read-context",
        execute: async ({ state }) => {
          if (!state.context) {
            throw new Error("Expected workflow context to persist");
          }
          return {
            keyCount: state.context.size,
            hasNewKey: state.context.get("new_key") === "new_value",
          };
        },
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const result = await workflow.run({ value: "ok" });

    expect(result.result).toEqual({
      keyCount: 1,
      hasNewKey: true,
    });
  });

  it("should pass step context mutations to downstream andAgent calls", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });
    const agent = createTestAgent();
    const generateTextSpy = vi.spyOn(agent, "generateText").mockImplementation(
      async (_task, options) =>
        ({
          output: `Found ${(options?.context?.size as number) ?? 0} keys in the context.`,
        }) as any,
    );

    const workflow = createWorkflow(
      {
        id: "workflow-context-agent-persistence",
        name: "Workflow Context Agent Persistence",
        input: z.object({
          value: z.string(),
        }),
        result: z.object({
          output: z.string(),
        }),
        memory,
      },
      andThen({
        id: "set-context",
        execute: async ({ data, state }) => {
          if (!state.context) {
            throw new Error("Expected workflow context to be initialized");
          }
          state.context.set("new_key", "new_value");
          return data;
        },
      }),
      andAgent(
        "check context",
        agent,
        {
          schema: Output.text(),
        },
        (output) => ({ output }),
      ),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const result = await workflow.run({ value: "ok" });

    expect(result.result).toEqual({
      output: "Found 1 keys in the context.",
    });

    expect(generateTextSpy).toHaveBeenCalledWith(
      "check context",
      expect.objectContaining({
        context: expect.any(Map),
      }),
    );
    const calledContext = generateTextSpy.mock.calls[0]?.[1]?.context;
    expect(calledContext?.get("new_key")).toBe("new_value");
  });

  it("should persist userId and conversationId in workflow state", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });

    const workflow = createWorkflow(
      {
        id: "workflow-user-context",
        name: "Workflow User Context",
        input: z.object({
          value: z.string(),
        }),
        result: z.object({
          value: z.string(),
        }),
        memory,
      },
      andThen({
        id: "echo",
        execute: async ({ data }) => data,
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const result = await workflow.run(
      { value: "ok" },
      {
        userId: "user-test-1",
        conversationId: "conv-test-1",
      },
    );

    const persistedState = await memory.getWorkflowState(result.executionId);

    expect(persistedState?.userId).toBe("user-test-1");
    expect(persistedState?.conversationId).toBe("conv-test-1");
  });

  it("should persist custom metadata in workflow state", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });

    const workflow = createWorkflow(
      {
        id: "workflow-metadata-context",
        name: "Workflow Metadata Context",
        input: z.object({
          value: z.string(),
        }),
        result: z.object({
          value: z.string(),
        }),
        memory,
      },
      andThen({
        id: "echo",
        execute: async ({ data }) => data,
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const result = await workflow.run(
      { value: "ok" },
      {
        userId: "user-test-1",
        metadata: {
          tenantId: "acme",
          region: "us-east-1",
          flags: { plan: "pro" },
        },
      },
    );

    const persistedState = await memory.getWorkflowState(result.executionId);

    expect(persistedState?.metadata).toEqual(
      expect.objectContaining({
        tenantId: "acme",
        region: "us-east-1",
        flags: { plan: "pro" },
        traceId: expect.any(String),
        spanId: expect.any(String),
      }),
    );
  });
});

describe.sequential("workflow streaming", () => {
  beforeEach(() => {
    const registry = WorkflowRegistry.getInstance();
    (registry as any).workflows.clear();
  });

  it("should provide stream method for streaming execution", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });
    const workflow = createWorkflow(
      {
        id: "stream-test",
        name: "Stream Test",
        input: z.object({ value: z.number() }),
        result: z.object({ result: z.number() }),
        memory,
      },
      andThen({
        id: "multiply",
        execute: async ({ data }) => ({ result: data.value * 2 }),
      }),
    );

    // Register workflow to registry
    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    // Use stream() method instead of run()
    const stream = workflow.stream({ value: 5 });

    expect(stream).toBeDefined();
    expect(stream[Symbol.asyncIterator]).toBeDefined();

    // Consume stream
    const events = [];
    for await (const event of stream) {
      events.push(event);
    }

    expect(events.length).toBeGreaterThan(0);
    expect(events.some((e) => e.type === "workflow-start")).toBe(true);
    expect(events.some((e) => e.type === "workflow-complete")).toBe(true);

    // Get the final result
    const result = await stream.result;
    expect(result).toEqual({ result: 10 });
  });

  it("should expose watch/watchAsync and streamLegacy on workflow stream results", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });
    const workflow = createWorkflow(
      {
        id: "stream-observer-surface",
        name: "Stream Observer Surface",
        input: z.object({ value: z.number() }),
        result: z.object({ result: z.number() }),
        memory,
      },
      andThen({
        id: "multiply",
        execute: async ({ data }) => ({ result: data.value * 3 }),
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const stream = workflow.stream({ value: 7 });
    const watchedEvents: string[] = [];
    const watchedAsyncEvents: string[] = [];

    const unsubscribe = stream.watch((event) => {
      watchedEvents.push(event.type);
    });
    const unsubscribeAsync = await stream.watchAsync((event) => {
      watchedAsyncEvents.push(event.type);
    });

    for await (const _event of stream) {
      // Drain the iterator to completion.
    }

    unsubscribe();
    unsubscribeAsync();

    expect(watchedEvents.length).toBeGreaterThan(0);
    expect(watchedAsyncEvents.length).toBeGreaterThan(0);
    expect(watchedEvents).toContain("workflow-start");
    expect(watchedEvents).toContain("workflow-complete");
    expect(watchedAsyncEvents).toContain("workflow-start");
    expect(watchedAsyncEvents).toContain("workflow-complete");

    const legacyState = await stream.streamLegacy().getWorkflowState();
    expect(legacyState).toEqual(
      expect.objectContaining({
        id: stream.executionId,
        status: "completed",
      }),
    );
  });

  it("should expose observeStream as readable stream on workflow stream results", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });
    const workflow = createWorkflow(
      {
        id: "stream-observe-readable",
        name: "Stream Observe Readable",
        input: z.object({ value: z.number() }),
        result: z.object({ result: z.number() }),
        memory,
      },
      andThen({
        id: "multiply",
        execute: async ({ data }) => ({ result: data.value * 2 }),
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const stream = workflow.stream({ value: 4 });
    const reader = stream.observeStream().getReader();
    const observedTypes: string[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        observedTypes.push(value.type);
      }
    }

    expect(observedTypes).toContain("workflow-start");
    expect(observedTypes).toContain("workflow-complete");
    expect(await stream.result).toEqual({ result: 8 });
  });

  it("should have usage with default values", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });
    const workflow = createWorkflow(
      {
        id: "usage-test",
        name: "Usage Test",
        input: z.object({ text: z.string() }),
        result: z.object({ upper: z.string() }),
        memory,
      },
      andThen({
        id: "uppercase",
        execute: async ({ data }) => ({ upper: data.text.toUpperCase() }),
      }),
    );

    // Register workflow to registry
    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const result = await workflow.run({ text: "hello" });

    expect(result.usage).toBeDefined();
    expect(result.usage).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    });
  });

  it("should produce UI message stream response from workflow stream", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });
    const workflow = createWorkflow(
      {
        id: "ui-stream-test",
        name: "UI Stream Test",
        input: z.object({ n: z.number() }),
        result: z.object({ out: z.number() }),
        memory,
      },
      andThen({
        id: "add-one",
        name: "Add One",
        execute: async ({ data }) => {
          return { out: data.n + 1 };
        },
      }),
    );

    const resp = workflow.stream({ n: 41 }).toUIMessageStreamResponse() as { body: ReadableStream };
    // Read the SSE body to completion and assert it contains expected chunks
    const reader = resp.body.getReader();

    const decoder = new TextDecoder();
    // Parse SSE 'data:' lines into JSON to ensure they are valid UIMessage chunks
    const parsedChunks: UIMessageChunk[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // UI Messages start with "data:" prefix
      const chunk = decoder.decode(value).replace("data:", "");
      try {
        parsedChunks.push(JSON.parse(chunk));
      } catch (_) {}
    }

    expect(parsedChunks.length).toBeGreaterThan(0);

    const allowedTypes = [
      "data-workflow-start",
      "data-workflow-complete",
      "data-step-start",
      "data-step-complete",
    ];
    for (const chunk of parsedChunks) {
      expect(allowedTypes.includes(chunk.type)).toBe(true);
    }
  });
});

describe.sequential("workflow.startAsync", () => {
  beforeEach(() => {
    const registry = WorkflowRegistry.getInstance();
    (registry as any).workflows.clear();
  });

  it("should return immediately and complete in the background", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });
    let releaseStep: (() => void) | undefined;
    const stepGate = new Promise<void>((resolve) => {
      releaseStep = resolve;
    });

    const workflow = createWorkflow(
      {
        id: "start-async-background",
        name: "Start Async Background",
        input: z.object({ value: z.number() }),
        result: z.object({ result: z.number() }),
        memory,
      },
      andThen({
        id: "wait-for-release",
        execute: async ({ data }) => {
          await stepGate;
          return { result: data.value * 2 };
        },
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const startResult = await workflow.startAsync({ value: 21 });

    expect(startResult).toEqual({
      executionId: expect.any(String),
      workflowId: "start-async-background",
      startAt: expect.any(Date),
    });

    let runningState = await memory.getWorkflowState(startResult.executionId);
    for (let i = 0; i < 100 && runningState?.status !== "running"; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      runningState = await memory.getWorkflowState(startResult.executionId);
    }
    expect(runningState?.status).toBe("running");

    releaseStep?.();

    let completedState = await memory.getWorkflowState(startResult.executionId);
    for (let i = 0; i < 100 && completedState?.status !== "completed"; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      completedState = await memory.getWorkflowState(startResult.executionId);
    }

    expect(completedState?.status).toBe("completed");
    expect(completedState?.output).toEqual({ result: 42 });
  });

  it("should persist error state when background execution fails", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });

    const workflow = createWorkflow(
      {
        id: "start-async-error",
        name: "Start Async Error",
        input: z.object({ value: z.number() }),
        result: z.object({ result: z.number() }),
        memory,
      },
      andThen({
        id: "throw-error",
        execute: async () => {
          throw new Error("startAsync failure");
        },
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const startResult = await workflow.startAsync({ value: 1 });
    let erroredState = await memory.getWorkflowState(startResult.executionId);

    for (let i = 0; i < 100 && erroredState?.status !== "error"; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      erroredState = await memory.getWorkflowState(startResult.executionId);
    }

    expect(erroredState?.status).toBe("error");
    expect(erroredState?.metadata).toEqual(
      expect.objectContaining({
        errorMessage: "startAsync failure",
      }),
    );
  });

  it("should respect executionId passed in options", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });

    const workflow = createWorkflow(
      {
        id: "start-async-execution-id",
        name: "Start Async Execution ID",
        input: z.object({ value: z.number() }),
        result: z.object({ value: z.number() }),
        memory,
      },
      andThen({
        id: "echo",
        execute: async ({ data }) => data,
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const executionId = "execution-id-start-async";
    const startResult = await workflow.startAsync(
      { value: 5 },
      {
        executionId,
      },
    );

    expect(startResult.executionId).toBe(executionId);

    let state = await memory.getWorkflowState(executionId);
    for (let i = 0; i < 100 && state?.status !== "completed"; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      state = await memory.getWorkflowState(executionId);
    }

    expect(state?.status).toBe("completed");
    expect(state?.output).toEqual({ value: 5 });
  });

  it("should reject resumeFrom options to avoid overwriting suspended runs", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });

    const workflow = createWorkflow(
      {
        id: "start-async-reject-resume-from",
        name: "Start Async Reject Resume From",
        input: z.object({ value: z.number() }),
        result: z.object({ value: z.number() }),
        memory,
      },
      andThen({
        id: "echo",
        execute: async ({ data }) => data,
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const executionId = "suspended-run";
    const suspendedAt = new Date();
    await memory.setWorkflowState(executionId, {
      id: executionId,
      workflowId: "start-async-reject-resume-from",
      workflowName: "Start Async Reject Resume From",
      status: "suspended",
      input: { value: 10 },
      workflowState: { stage: "waiting" },
      suspension: {
        suspendedAt,
        reason: "awaiting-input",
        stepIndex: 0,
      },
      metadata: {
        marker: "preserve-me",
      },
      createdAt: suspendedAt,
      updatedAt: suspendedAt,
    });

    await expect(
      workflow.startAsync(
        { value: 5 },
        {
          resumeFrom: {
            executionId,
            resumeStepIndex: 0,
          },
        },
      ),
    ).rejects.toThrow("startAsync does not support resumeFrom");

    const persisted = await memory.getWorkflowState(executionId);
    expect(persisted?.status).toBe("suspended");
    expect(persisted?.metadata).toEqual(
      expect.objectContaining({
        marker: "preserve-me",
      }),
    );
  });
});

describe.sequential("workflow.restart", () => {
  beforeEach(() => {
    const registry = WorkflowRegistry.getInstance();
    (registry as any).workflows.clear();
  });

  it("should restart an interrupted running execution from checkpoint", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });
    const executions: string[] = [];

    const workflow = createWorkflow(
      {
        id: "restart-interrupted",
        name: "Restart Interrupted",
        input: z.object({ value: z.number() }),
        result: z.object({ total: z.number() }),
        memory,
      },
      andThen({
        id: "step-1",
        execute: async ({ data }) => {
          executions.push("step-1");
          return { value: data.value + 1 };
        },
      }),
      andThen({
        id: "step-2",
        execute: async ({ data, getStepData }) => {
          executions.push("step-2");
          const step1Output = getStepData("step-1")?.output as { value?: number } | undefined;
          return { total: (step1Output?.value ?? data.value) + 10 };
        },
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const executionId = "restart-interrupted-exec";
    const suspendedAt = new Date();
    await memory.setWorkflowState(executionId, {
      id: executionId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: "running",
      input: { value: 2 },
      context: [["tenant", "acme"]],
      workflowState: { plan: "pro" },
      metadata: {
        [VOLTAGENT_RESTART_CHECKPOINT_KEY]: {
          resumeStepIndex: 1,
          lastCompletedStepIndex: 0,
          stepExecutionState: { value: 3 },
          completedStepsData: [{ stepId: "step-1", stepIndex: 0 }],
          workflowState: { plan: "pro" },
          stepData: {
            "step-1": {
              input: { value: 2 },
              output: { value: 3 },
              status: "success",
              error: null,
            },
          },
          usage: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
          },
          eventSequence: 3,
          checkpointedAt: suspendedAt,
        },
      },
      createdAt: suspendedAt,
      updatedAt: suspendedAt,
    });

    const restarted = await workflow.restart(executionId);

    expect(restarted.status).toBe("completed");
    expect(restarted.result).toEqual({ total: 13 });
    expect(executions).toEqual(["step-2"]);

    const persisted = await memory.getWorkflowState(executionId);
    expect(persisted?.status).toBe("completed");
  });

  it("should fail restart when execution is not running", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });

    const workflow = createWorkflow(
      {
        id: "restart-invalid-status",
        name: "Restart Invalid Status",
        input: z.object({ value: z.number() }),
        result: z.object({ value: z.number() }),
        memory,
      },
      andThen({
        id: "echo",
        execute: async ({ data }) => data,
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const completed = await workflow.run({ value: 4 });
    await expect(workflow.restart(completed.executionId)).rejects.toThrow("Execution");
  });

  it("should restart all active runs and report partial failures", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });

    const workflow = createWorkflow(
      {
        id: "restart-bulk",
        name: "Restart Bulk",
        input: z.object({ value: z.number() }),
        result: z.object({ value: z.number() }),
        memory,
      },
      andThen({
        id: "echo",
        execute: async ({ data }) => data,
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const now = new Date();
    await memory.setWorkflowState("restart-bulk-ok", {
      id: "restart-bulk-ok",
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: "running",
      input: { value: 7 },
      createdAt: now,
      updatedAt: now,
    });

    await memory.setWorkflowState("restart-bulk-bad", {
      id: "restart-bulk-bad",
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: "running",
      createdAt: now,
      updatedAt: now,
    });

    const summary = await workflow.restartAllActive();

    expect(summary.restarted).toContain("restart-bulk-ok");
    expect(summary.failed.some((failure) => failure.executionId === "restart-bulk-bad")).toBe(true);

    const restartedState = await memory.getWorkflowState("restart-bulk-ok");
    expect(restartedState?.status).toBe("completed");
  });

  it("should preserve workflowState, context, usage, and stepData on restart", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });
    let step1Runs = 0;

    const workflow = createWorkflow(
      {
        id: "restart-preserve-state",
        name: "Restart Preserve State",
        input: z.object({ seed: z.number() }),
        result: z.object({
          previous: z.number(),
          plan: z.string(),
          role: z.string(),
          tokens: z.number(),
        }),
        memory,
      },
      andThen({
        id: "step-1",
        execute: async ({ data }) => {
          step1Runs += 1;
          return { seed: data.seed + 1 };
        },
      }),
      andThen({
        id: "step-2",
        execute: async ({ getStepData, workflowState, state }) => {
          const previous = (getStepData("step-1")?.output as { seed: number } | undefined)?.seed;
          return {
            previous: previous ?? -1,
            plan: (workflowState.plan as string) ?? "unknown",
            role: (state.context?.get("role") as string) ?? "missing",
            tokens: state.usage.totalTokens,
          };
        },
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const executionId = "restart-preserve-exec";
    const now = new Date();
    await memory.setWorkflowState(executionId, {
      id: executionId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: "running",
      input: { seed: 1 },
      context: [["role", "admin"]],
      workflowState: { plan: "pro" },
      metadata: {
        [VOLTAGENT_RESTART_CHECKPOINT_KEY]: {
          resumeStepIndex: 1,
          lastCompletedStepIndex: 0,
          stepExecutionState: { seed: 2 },
          completedStepsData: [{ stepId: "step-1", stepIndex: 0 }],
          workflowState: { plan: "pro" },
          stepData: {
            "step-1": {
              input: { seed: 1 },
              output: { seed: 2 },
              status: "success",
              error: null,
            },
          },
          usage: {
            promptTokens: 5,
            completionTokens: 7,
            totalTokens: 12,
          },
          eventSequence: 4,
          checkpointedAt: now,
        },
      },
      createdAt: now,
      updatedAt: now,
    });

    const restarted = await workflow.restart(executionId);

    expect(restarted.status).toBe("completed");
    expect(step1Runs).toBe(0);
    expect(restarted.result).toEqual({
      previous: 2,
      plan: "pro",
      role: "admin",
      tokens: 12,
    });
    expect(restarted.usage.totalTokens).toBe(12);
  });

  it("should rehydrate serialized checkpoint step errors on restart", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });

    const workflow = createWorkflow(
      {
        id: "restart-error-rehydrate",
        name: "Restart Error Rehydrate",
        input: z.object({ value: z.number() }),
        result: z.object({
          message: z.string(),
          hasStack: z.boolean(),
          name: z.string(),
        }),
        memory,
      },
      andThen({
        id: "step-1",
        execute: async ({ data }) => ({ value: data.value + 1 }),
      }),
      andThen({
        id: "step-2",
        execute: async ({ getStepData }) => {
          const stepError = getStepData("step-1")?.error;
          return {
            message: stepError instanceof Error ? stepError.message : "missing",
            hasStack: stepError instanceof Error && Boolean(stepError.stack),
            name: stepError instanceof Error ? stepError.name : "unknown",
          };
        },
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const executionId = "restart-error-rehydrate-exec";
    const now = new Date();
    await memory.setWorkflowState(executionId, {
      id: executionId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: "running",
      input: { value: 1 },
      metadata: {
        [VOLTAGENT_RESTART_CHECKPOINT_KEY]: {
          resumeStepIndex: 1,
          lastCompletedStepIndex: 0,
          stepExecutionState: { value: 2 },
          completedStepsData: [{ stepId: "step-1", stepIndex: 0 }],
          stepData: {
            "step-1": {
              input: { value: 1 },
              output: undefined,
              status: "error",
              error: {
                message: "step-1 failed previously",
                stack: "Error: step-1 failed previously",
                name: "Error",
              },
            },
          },
          checkpointedAt: now,
        },
      },
      createdAt: now,
      updatedAt: now,
    });

    const restarted = await workflow.restart(executionId);
    expect(restarted.status).toBe("completed");
    expect(restarted.result).toEqual({
      message: "step-1 failed previously",
      hasStack: true,
      name: "Error",
    });
  });

  it("should restart safely when persisted context is not tuple-serialized", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });

    const workflow = createWorkflow(
      {
        id: "restart-invalid-context",
        name: "Restart Invalid Context",
        input: z.object({ value: z.number() }),
        result: z.object({ value: z.number(), role: z.string() }),
        memory,
      },
      andThen({
        id: "echo",
        execute: async ({ data, state }) => ({
          value: data.value,
          role: (state.context?.get("role") as string) ?? "missing",
        }),
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    const executionId = "restart-invalid-context-exec";
    const now = new Date();
    await memory.setWorkflowState(executionId, {
      id: executionId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: "running",
      input: { value: 9 },
      context: { role: "admin" } as any,
      createdAt: now,
      updatedAt: now,
    });

    const restarted = await workflow.restart(executionId);
    expect(restarted.status).toBe("completed");
    expect(restarted.result).toEqual({ value: 9, role: "missing" });
  });
});

describe.sequential("workflow memory defaults", () => {
  beforeEach(() => {
    const registry = AgentRegistry.getInstance();
    registry.setGlobalWorkflowMemory(undefined);
    registry.setGlobalMemory(undefined);
  });

  afterEach(() => {
    const registry = AgentRegistry.getInstance();
    registry.setGlobalWorkflowMemory(undefined);
    registry.setGlobalMemory(undefined);
  });

  it("should use global workflow memory when not configured", () => {
    const registry = AgentRegistry.getInstance();
    const globalWorkflowMemory = new Memory({ storage: new InMemoryStorageAdapter() });
    registry.setGlobalWorkflowMemory(globalWorkflowMemory);

    const workflow = createWorkflow(
      {
        id: "global-workflow-memory",
        name: "Global Workflow Memory",
        input: z.object({ value: z.string() }),
        result: z.object({ value: z.string() }),
      },
      andThen({
        id: "echo",
        execute: async ({ data }) => data,
      }),
    );

    expect(workflow.memory).toBe(globalWorkflowMemory);
  });

  it("should fall back to global memory when workflow memory is not set", () => {
    const registry = AgentRegistry.getInstance();
    const globalMemory = new Memory({ storage: new InMemoryStorageAdapter() });
    registry.setGlobalMemory(globalMemory);

    const workflow = createWorkflow(
      {
        id: "global-memory-fallback",
        name: "Global Memory Fallback",
        input: z.object({ value: z.string() }),
        result: z.object({ value: z.string() }),
      },
      andThen({
        id: "echo",
        execute: async ({ data }) => data,
      }),
    );

    expect(workflow.memory).toBe(globalMemory);
  });

  it("should prefer explicit memory over global defaults", () => {
    const registry = AgentRegistry.getInstance();
    const globalWorkflowMemory = new Memory({ storage: new InMemoryStorageAdapter() });
    const explicitMemory = new Memory({ storage: new InMemoryStorageAdapter() });
    registry.setGlobalWorkflowMemory(globalWorkflowMemory);

    const workflow = createWorkflow(
      {
        id: "explicit-memory",
        name: "Explicit Memory",
        input: z.object({ value: z.string() }),
        result: z.object({ value: z.string() }),
        memory: explicitMemory,
      },
      andThen({
        id: "echo",
        execute: async ({ data }) => data,
      }),
    );

    expect(workflow.memory).toBe(explicitMemory);
  });
});

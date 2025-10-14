import type { UIMessageChunk } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { LocalScorerDefinition } from "../eval/runtime";
import { Memory } from "../memory";
import { InMemoryStorageAdapter } from "../memory/adapters/storage/in-memory";
import { createWorkflow } from "./core";
import type { WorkflowEvalContext } from "./eval/types";
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

describe.sequential("workflow eval scoring", () => {
  beforeEach(() => {
    const registry = WorkflowRegistry.getInstance();
    (registry as any).workflows.clear();
  });

  it("runs step-level scorers when configured", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });
    const onStepResult = vi.fn();

    const stepScorer: LocalScorerDefinition<WorkflowEvalContext, Record<string, unknown>> = {
      id: "step-scorer",
      name: "Step Scorer",
      scorer: () => ({
        status: "success",
        score: 0.9,
      }),
    };

    const workflow = createWorkflow(
      {
        id: "eval-test",
        name: "Eval Test",
        input: z.object({ value: z.number() }),
        result: z.object({ doubled: z.number() }),
        memory,
      },
      andThen({
        id: "multiply",
        name: "Multiply",
        execute: async ({ data }) => ({ doubled: data.value * 2 }),
        eval: {
          scorers: {
            quality: {
              scorer: stepScorer,
              onResult: onStepResult,
            },
          },
        },
      }),
      andThen({
        id: "identity",
        execute: async ({ data }) => data,
      }),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow);

    await workflow.run({ value: 3 });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onStepResult).toHaveBeenCalledTimes(1);
    const [result] = onStepResult.mock.calls[0];
    expect(result.status).toBe("success");
    expect(result.payload.target).toBe("step");
    expect(result.payload.step?.id).toBe("multiply");
    expect(result.payload.status).toBe("completed");
    expect(result.metadata?.workflow?.id).toBe("eval-test");
    expect(result.metadata?.step).toEqual(
      expect.objectContaining({
        id: "multiply",
        metadata: expect.objectContaining({
          durationMs: expect.any(Number),
        }),
      }),
    );
  });
});

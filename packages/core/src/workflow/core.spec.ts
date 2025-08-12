import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { createTestLibSQLStorage } from "../test-utils/libsql-test-helpers";
import { createWorkflow } from "./core";
import { WorkflowRegistry } from "./registry";
import { andThen } from "./steps";

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
    const memory = createTestLibSQLStorage("core_stream_test");
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
    const memory = createTestLibSQLStorage("core_usage_test");
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
});

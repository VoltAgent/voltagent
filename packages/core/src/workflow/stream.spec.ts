import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Memory } from "../memory";
import { InMemoryStorageAdapter } from "../memory/adapters/storage/in-memory";
import { createWorkflowChain } from "./chain";
import { WorkflowRegistry } from "./registry";
import { WorkflowStreamController, WorkflowStreamWriterImpl } from "./stream";
import { createSuspendController } from "./suspend-controller";
import type { WorkflowStreamEvent } from "./types";

describe("WorkflowStreamController", () => {
  it("should emit and collect events", async () => {
    const controller = new WorkflowStreamController();
    const events: WorkflowStreamEvent[] = [];

    // Start consuming stream in background
    const consumePromise = (async () => {
      for await (const event of controller.getStream()) {
        events.push(event);
      }
    })();

    // Emit events
    controller.emit({
      type: "test-event-1",
      executionId: "exec-1",
      from: "test",
      status: "running",
      timestamp: new Date().toISOString(),
    });

    controller.emit({
      type: "test-event-2",
      executionId: "exec-1",
      from: "test",
      status: "success",
      timestamp: new Date().toISOString(),
    });

    // Close stream
    controller.close();

    // Wait for consumption to complete
    await consumePromise;

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("test-event-1");
    expect(events[1].type).toBe("test-event-2");
  });

  it("should handle abort signal", async () => {
    const controller = new WorkflowStreamController();
    const events: WorkflowStreamEvent[] = [];

    // Start consuming
    const consumePromise = (async () => {
      for await (const event of controller.getStream()) {
        events.push(event);
      }
    })();

    // Emit one event
    controller.emit({
      type: "before-abort",
      executionId: "exec-1",
      from: "test",
      status: "running",
      timestamp: new Date().toISOString(),
    });

    // Abort the stream
    controller.abort();

    // Try to emit after abort (should be ignored)
    controller.emit({
      type: "after-abort",
      executionId: "exec-1",
      from: "test",
      status: "running",
      timestamp: new Date().toISOString(),
    });

    await consumePromise;

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("before-abort");
  });
});

describe("WorkflowStreamWriterImpl", () => {
  it("should write custom events with automatic fields", () => {
    const controller = new WorkflowStreamController();
    const writer = new WorkflowStreamWriterImpl(
      controller,
      "exec-123",
      "step-1",
      "MyStep",
      0,
      new Map([["userId", "user-1"]]),
    );

    const emitSpy = vi.spyOn(controller, "emit");

    writer.write({
      type: "custom-event",
      metadata: { foo: "bar" },
    });

    expect(emitSpy).toHaveBeenCalledWith({
      type: "custom-event",
      executionId: "exec-123",
      from: "MyStep",
      input: undefined,
      output: undefined,
      status: "running",
      context: new Map([["userId", "user-1"]]),
      timestamp: expect.any(String),
      stepIndex: 0,
      metadata: { foo: "bar" },
      error: undefined,
    });
  });

  it("should allow override of automatic fields", () => {
    const controller = new WorkflowStreamController();
    const writer = new WorkflowStreamWriterImpl(controller, "exec-123", "step-1", "MyStep", 0);

    const emitSpy = vi.spyOn(controller, "emit");

    writer.write({
      type: "custom-event",
      from: "OverriddenFrom",
      status: "success",
      stepIndex: 5,
    });

    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "OverriddenFrom",
        status: "success",
        stepIndex: 5,
      }),
    );
  });

  describe("pipeFrom", () => {
    it("should pipe agent stream events", async () => {
      const controller = new WorkflowStreamController();
      const writer = new WorkflowStreamWriterImpl(controller, "exec-123", "step-1", "MyStep", 0);

      const emitSpy = vi.spyOn(controller, "emit");

      // Mock agent fullStream
      const mockFullStream = async function* () {
        yield {
          type: "text-delta" as const,
          id: "text-1",
          delta: "Hello",
          text: "Hello",
        };
        yield {
          type: "tool-call" as const,
          toolCallId: "call-1",
          toolName: "search",
          input: { query: "test" },
        };
        yield {
          type: "tool-result" as const,
          toolCallId: "call-1",
          toolName: "search",
          input: { query: "test" },
          output: { found: true },
        };
        yield {
          type: "finish" as const,
          finishReason: "stop",
          totalUsage: { promptTokens: 40, completionTokens: 60, totalTokens: 100 },
        };
      };

      await writer.pipeFrom(mockFullStream());

      expect(emitSpy).toHaveBeenCalledTimes(4);

      // Check text-delta mapping
      expect(emitSpy).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          type: "text-delta",
          output: "Hello",
          metadata: expect.objectContaining({ originalType: "text-delta" }),
        }),
      );

      // Check tool-call mapping
      expect(emitSpy).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: "tool-call",
          input: { query: "test" },
          metadata: expect.objectContaining({ originalType: "tool-call", toolName: "search" }),
        }),
      );

      // Check tool-result mapping
      expect(emitSpy).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          type: "tool-result",
          output: { found: true },
          metadata: expect.objectContaining({ originalType: "tool-result", toolName: "search" }),
        }),
      );

      // Check finish mapping
      expect(emitSpy).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          type: "finish",
          metadata: expect.objectContaining({
            originalType: "finish",
            finishReason: "stop",
            usage: { promptTokens: 40, completionTokens: 60, totalTokens: 100 },
          }),
        }),
      );
    });

    it("should apply prefix to event types", async () => {
      const controller = new WorkflowStreamController();
      const writer = new WorkflowStreamWriterImpl(controller, "exec-123", "step-1", "MyStep", 0);

      const emitSpy = vi.spyOn(controller, "emit");

      const mockFullStream = async function* () {
        yield {
          type: "text-delta" as const,
          id: "text-1",
          delta: "Hello",
          text: "Hello",
        };
      };

      await writer.pipeFrom(mockFullStream(), { prefix: "agent-" });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "agent-text-delta",
        }),
      );
    });

    it("should filter events based on predicate", async () => {
      const controller = new WorkflowStreamController();
      const writer = new WorkflowStreamWriterImpl(controller, "exec-123", "step-1", "MyStep", 0);

      const emitSpy = vi.spyOn(controller, "emit");

      const mockFullStream = async function* () {
        yield {
          type: "text-delta" as const,
          id: "text-1",
          delta: "Hello",
          text: "Hello",
        };
        yield {
          type: "finish" as const,
          finishReason: "stop",
          totalUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        };
        yield {
          type: "tool-call" as const,
          toolCallId: "call-1",
          toolName: "search",
          input: {},
        };
      };

      await writer.pipeFrom(mockFullStream(), {
        filter: (part) => part.type !== "finish",
      });

      expect(emitSpy).toHaveBeenCalledTimes(2);
      expect(emitSpy).not.toHaveBeenCalledWith(expect.objectContaining({ type: "finish" }));
    });

    it("should use custom agentId in from field", async () => {
      const controller = new WorkflowStreamController();
      const writer = new WorkflowStreamWriterImpl(controller, "exec-123", "step-1", "MyStep", 0);

      const emitSpy = vi.spyOn(controller, "emit");

      const mockFullStream = async function* () {
        yield { type: "text-delta" as const, id: "text-1", text: "Hello" };
      };

      await writer.pipeFrom(mockFullStream(), { agentId: "CustomAgent" });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "CustomAgent",
        }),
      );
    });

    it("should use subAgentId from stream part if available", async () => {
      const controller = new WorkflowStreamController();
      const writer = new WorkflowStreamWriterImpl(controller, "exec-123", "step-1", "MyStep", 0);

      const emitSpy = vi.spyOn(controller, "emit");

      const mockFullStream = async function* () {
        yield {
          type: "text-delta" as const,
          id: "text-1",
          delta: "Hello",
          text: "Hello",
          subAgentId: "SubAgent1",
        };
      };

      await writer.pipeFrom(mockFullStream());

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "SubAgent1",
        }),
      );
    });
  });
});

describe("Workflow Stream Integration", () => {
  beforeEach(() => {
    const registry = WorkflowRegistry.getInstance();
    (registry as any).workflows.clear();
  });

  it("should emit workflow lifecycle events", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });
    const workflow = createWorkflowChain({
      id: "test-workflow",
      name: "Test Workflow",
      input: z.object({ value: z.number() }),
      result: z.object({ result: z.number() }),
      memory,
    }).andThen({
      id: "double",
      execute: async ({ data }) => ({ result: data.value * 2 }),
    });

    // Register workflow to registry
    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow.toWorkflow());

    // Use stream() method for streaming execution
    const stream = workflow.stream({ value: 5 });
    const events: WorkflowStreamEvent[] = [];

    for await (const event of stream) {
      events.push(event);
    }

    expect(events).toContainEqual(
      expect.objectContaining({
        type: "workflow-start",
        from: "Test Workflow",
        input: { value: 5 },
        status: "running",
      }),
    );

    expect(events).toContainEqual(
      expect.objectContaining({
        type: "step-start",
        from: "double",
        stepType: "func",
      }),
    );

    expect(events).toContainEqual(
      expect.objectContaining({
        type: "step-complete",
        from: "double",
        output: { result: 10 },
        status: "success",
      }),
    );

    expect(events).toContainEqual(
      expect.objectContaining({
        type: "workflow-complete",
        from: "Test Workflow",
        output: { result: 10 },
        status: "success",
      }),
    );
  });

  it("should allow custom events from steps", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });
    const workflow = createWorkflowChain({
      id: "custom-events",
      name: "Custom Events",
      input: z.object({ items: z.array(z.string()) }),
      result: z.object({ processed: z.number() }),
      memory,
    }).andThen({
      id: "process",
      execute: async ({ data, writer }) => {
        writer.write({
          type: "processing-start",
          metadata: { itemCount: data.items.length },
        });

        // Simulate processing
        await new Promise((resolve) => setTimeout(resolve, 10));

        writer.write({
          type: "processing-complete",
          output: { processedCount: data.items.length },
        });

        return { processed: data.items.length };
      },
    });

    // Register workflow to registry
    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow.toWorkflow());

    // Use stream() method for streaming execution
    const stream = workflow.stream({ items: ["a", "b", "c"] });
    const events: WorkflowStreamEvent[] = [];

    for await (const event of stream) {
      events.push(event);
    }

    const customEvents = events.filter((e) =>
      ["processing-start", "processing-complete"].includes(e.type),
    );

    expect(customEvents).toHaveLength(2);
    expect(customEvents[0]).toMatchObject({
      type: "processing-start",
      metadata: { itemCount: 3 },
    });
    expect(customEvents[1]).toMatchObject({
      type: "processing-complete",
      output: { processedCount: 3 },
    });
  });

  it("should preserve event order", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });
    const workflow = createWorkflowChain({
      id: "event-order",
      name: "Event Order",
      input: z.object({ value: z.number() }),
      result: z.object({ result: z.number() }),
      memory,
    })
      .andThen({
        id: "step1",
        execute: async ({ data, writer }) => {
          writer.write({ type: "custom-1" });
          return { ...data, step1: true };
        },
      })
      .andThen({
        id: "step2",
        execute: async ({ data, writer }) => {
          writer.write({ type: "custom-2" });
          return { ...data, result: data.value };
        },
      });

    // Register workflow to registry
    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow.toWorkflow());

    // Use stream() method for streaming execution
    const stream = workflow.stream({ value: 1 });
    const events: WorkflowStreamEvent[] = [];

    for await (const event of stream) {
      events.push(event);
    }

    const eventTypes = events.map((e) => e.type);
    const expectedOrder = [
      "workflow-start",
      "step-start",
      "custom-1",
      "step-complete",
      "step-start",
      "custom-2",
      "step-complete",
      "workflow-complete",
    ];

    expect(eventTypes).toEqual(expectedOrder);
  });

  it("should handle errors in stream consumption", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });
    const workflow = createWorkflowChain({
      id: "error-handling",
      name: "Error Handling",
      input: z.object({ value: z.number() }),
      result: z.object({ result: z.number() }),
      memory,
    }).andThen({
      id: "step",
      execute: async ({ data }) => ({ result: data.value }),
    });

    // Register workflow to registry
    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow.toWorkflow());

    // Use stream() method for streaming execution
    const stream = workflow.stream({ value: 1 });
    const processedEvents: string[] = [];
    const errors: Error[] = [];

    for await (const event of stream) {
      try {
        if (event.type === "step-complete") {
          throw new Error("Simulated processing error");
        }
        processedEvents.push(event.type);
      } catch (error) {
        errors.push(error as Error);
      }
    }

    // Stream should continue despite error
    expect(processedEvents).toContain("workflow-start");
    expect(processedEvents).toContain("step-start");
    expect(processedEvents).toContain("workflow-complete");
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe("Simulated processing error");
  });

  it("should cancel workflow execution via stream cancel", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });
    const workflow = createWorkflowChain({
      id: "cancel-stream",
      name: "Cancel Stream",
      input: z.object({ value: z.number() }),
      result: z.object({ result: z.number() }),
      memory,
    }).andThen({
      id: "long-running-step",
      execute: async ({ data }) => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { result: data.value * 2 };
      },
    });

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow.toWorkflow());

    const stream = workflow.stream({ value: 21 });
    const events: WorkflowStreamEvent[] = [];

    const consumePromise = (async () => {
      for await (const event of stream) {
        events.push(event);
      }
    })();

    await new Promise((resolve) => setTimeout(resolve, 10));
    stream.cancel("Testing cancel");

    await consumePromise;

    expect(await stream.status).toBe("cancelled");
    expect(await stream.result).toBeNull();

    const cancellation = await stream.cancellation;
    expect(cancellation?.reason).toBe("Testing cancel");

    expect(events.some((event) => event.type === "workflow-cancelled")).toBe(true);
  });

  it("should trigger provided suspend controller when cancelling stream", async () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });
    const workflow = createWorkflowChain({
      id: "cancel-with-controller",
      name: "Cancel With Controller",
      input: z.object({ value: z.number() }),
      result: z.object({ result: z.number() }),
      memory,
    }).andThen({
      id: "long-running-step",
      execute: async ({ data }) => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { result: data.value };
      },
    });

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow.toWorkflow());

    const controller = createSuspendController();
    const stream = workflow.stream({ value: 5 }, { suspendController: controller });

    await new Promise((resolve) => setTimeout(resolve, 10));
    stream.cancel("Stop from controller");

    expect(controller.isCancelled()).toBe(true);
    expect(controller.getCancelReason()).toBe("Stop from controller");

    await stream.status;
  });
});

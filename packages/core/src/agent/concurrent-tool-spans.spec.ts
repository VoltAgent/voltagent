import type { Span } from "@opentelemetry/api";
import * as ai from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { NodeVoltAgentObservability } from "../observability";
import { createTool } from "../tool";
import { Agent } from "./agent";
import { SubAgentManager } from "./subagent";

// Mock the AI SDK functions
vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    generateText: vi.fn(),
    streamText: vi.fn(),
    generateObject: vi.fn(),
    streamObject: vi.fn(),
    stepCountIs: vi.fn(() => vi.fn(() => false)),
  };
});

describe("Agent Concurrent Tool Spans", () => {
  let observability: NodeVoltAgentObservability;
  let mockModel: MockLanguageModelV3;

  beforeEach(() => {
    observability = new NodeVoltAgentObservability();
    mockModel = new MockLanguageModelV3();
  });

  it("should provide unique parent spans to tools running in parallel", async () => {
    const capturedSpans: Map<string, Span> = new Map();

    // Create two tools that capture their parentToolSpan
    const toolA = createTool({
      name: "toolA",
      description: "Tool A",
      parameters: z.object({}),
      execute: async (_, options) => {
        // Capture the span passed in options
        const span = (options as any).parentToolSpan;
        capturedSpans.set("toolA", span);
        // Simulate some async work to allow interleaving
        await new Promise((resolve) => setTimeout(resolve, 50));
        return "resultA";
      },
    });

    const toolB = createTool({
      name: "toolB",
      description: "Tool B",
      parameters: z.object({}),
      execute: async (_, options) => {
        // Capture the span passed in options
        const span = (options as any).parentToolSpan;
        capturedSpans.set("toolB", span);
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "resultB";
      },
    });

    const agent = new Agent({
      name: "test-agent",
      instructions: "test instructions",
      model: mockModel as any,
      observability,
      tools: [toolA, toolB],
      toolRouting: false, // Disable tool routing to ensure tools are directly available
    });

    // Mock ai.generateText to simulate parallel tool execution
    vi.mocked(ai.generateText).mockImplementation(async (options: any) => {
      // options.tools contains the wrapped tools from Agent.ts
      const toolAWrapper = options.tools.toolA;
      const toolBWrapper = options.tools.toolB;

      // Parallel tools execution simulation
      await Promise.all([toolAWrapper.execute({}), toolBWrapper.execute({})]);

      return {
        text: "Done",
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
        steps: [],
        toolCalls: [],
        toolResults: [],
        response: { id: "test", modelId: "test", timestamp: new Date(), messages: [] },
      } as any;
    });

    await agent.generateText("Run tools in parallel");

    expect(capturedSpans.has("toolA")).toBe(true);
    expect(capturedSpans.has("toolB")).toBe(true);

    const spanA = capturedSpans.get("toolA");
    const spanB = capturedSpans.get("toolB");

    expect(spanA).toBeDefined();
    expect(spanB).toBeDefined();

    // Spans shouldn't be the same
    expect(spanA).not.toBe(spanB);
    expect((spanA as any).name).toContain("tool.execution:toolA");
    expect((spanB as any).name).toContain("tool.execution:toolB");
  });

  it("should provide unique parent spans to subagents running in parallel via delegate_task", async () => {
    // 1. Setup SubAgentManager
    const subAgent = new Agent({
      name: "sub",
      instructions: "sub",
      model: mockModel as any,
    });

    // Mock generateText on subAgent to verify parentSpan
    const generateTextSpy = vi.spyOn(subAgent, "generateText");
    generateTextSpy.mockResolvedValue({ text: "ok", usage: {} } as any);

    const manager = new SubAgentManager("parent", [{ agent: subAgent, method: "generateText" }]);

    // 2. Create delegate_task tool
    const delegateTool = manager.createDelegateTool({
      sourceAgent: new Agent({
        name: "parent",
        instructions: "parent",
        model: mockModel as any,
      }),
      // Simulate creation-time parentToolSpan (stale/wrong one)
      parentToolSpan: { spanContext: () => ({ traceId: "stale" }) } as any,
    });

    // 3. Simulate concurrent execution with distinct parent spans
    const span1 = { spanContext: () => ({ traceId: "trace1" }) } as any;
    const span2 = { spanContext: () => ({ traceId: "trace2" }) } as any;

    await Promise.all([
      delegateTool.execute?.({ task: "task1", targetAgents: ["sub"] }, {
        parentToolSpan: span1,
      } as any),
      delegateTool.execute?.({ task: "task2", targetAgents: ["sub"] }, {
        parentToolSpan: span2,
      } as any),
    ]);

    // 4. Verify subAgent.generateText was called with correct parent spans
    expect(generateTextSpy).toHaveBeenCalledTimes(2);

    const calls = generateTextSpy.mock.calls;
    // Extract parentSpan from options (second argument to generateText)
    const spans = calls.map((c) => (c[1] as any).parentSpan);

    // Should contain the spans passed during execution
    expect(spans).toContain(span1);
    expect(spans).toContain(span2);

    // Should NOT contain the stale creation-time span
    const staleSpanInCalls = spans.some((s) => s && s.spanContext().traceId === "stale");
    expect(staleSpanInCalls).toBe(false);
  });
});

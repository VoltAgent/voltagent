import { VoltAgentExporter } from "./exporter";
import { VoltAgentObservabilitySDK } from "@voltagent/sdk";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { ExportResultCode } from "@opentelemetry/core";

// Mock the SDK
jest.mock("@voltagent/sdk");

describe("VoltAgentExporter", () => {
  let exporter: VoltAgentExporter;
  let mockSdk: jest.Mocked<VoltAgentObservabilitySDK>;
  let mockTrace: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock trace object
    mockTrace = {
      end: jest.fn().mockResolvedValue(undefined),
    };

    // Create mock SDK
    mockSdk = {
      trace: jest.fn().mockResolvedValue(mockTrace),
      addEventToTrace: jest.fn().mockResolvedValue(undefined),
      flush: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Mock the SDK constructor
    (VoltAgentObservabilitySDK as jest.Mock).mockImplementation(() => mockSdk);

    // Create exporter with debug enabled for testing
    exporter = new VoltAgentExporter({
      publicKey: "test-public-key",
      secretKey: "test-secret-key",
      baseUrl: "https://test-api.voltagent.dev",
      debug: true,
    });
  });

  afterEach(async () => {
    await exporter.shutdown();
  });

  // Helper function to create mock spans
  const createMockSpan = (overrides: Partial<ReadableSpan> = {}): ReadableSpan => {
    const defaultSpan: any = {
      name: "test-span",
      startTime: [Date.now() / 1000, 0],
      endTime: [Date.now() / 1000 + 1, 0],
      attributes: {},
      status: { code: 1 }, // OK
      spanContext: () => ({
        traceId: "trace-123",
        spanId: "span-123",
        traceFlags: 0,
        isRemote: false,
      }),
      instrumentationScope: { name: "ai", version: "1.0.0" },
      resource: {} as any,
      kind: 0,
      parentSpanId: undefined,
      events: [],
      links: [],
      duration: [1, 0],
      ended: true,
      droppedAttributesCount: 0,
      droppedEventsCount: 0,
      droppedLinksCount: 0,
      ...overrides,
    };

    // Add parentSpanId as a property for easier mocking
    if (overrides.parentSpanId) {
      defaultSpan.parentSpanId = overrides.parentSpanId;
    }

    return defaultSpan as ReadableSpan;
  };

  describe("Span Type Detection", () => {
    it("should detect generation spans correctly", () => {
      const span = createMockSpan({
        name: "ai.generateText",
        attributes: {
          "ai.telemetry.metadata.agentId": "test-agent",
        },
      });

      const result = (exporter as any).getSpanType(span);
      expect(result).toBe("generation");
    });

    it("should detect tool spans correctly", () => {
      const span = createMockSpan({
        name: "ai.toolCall",
        attributes: {
          "ai.toolCall.name": "weather",
        },
      });

      const result = (exporter as any).getSpanType(span);
      expect(result).toBe("tool");
    });

    it("should return unknown for unrecognized spans", () => {
      const span = createMockSpan({
        name: "unknown-operation",
        attributes: {},
      });

      const result = (exporter as any).getSpanType(span);
      expect(result).toBe("unknown");
    });
  });

  describe("Agent ID Extraction", () => {
    it("should extract agentId from span attributes", () => {
      const span = createMockSpan({
        name: "ai.generateText",
        attributes: {
          "ai.telemetry.metadata.agentId": "marketing-agent",
        },
      });

      const result = (exporter as any).extractAgentIdFromSpan(span);
      expect(result).toBe("marketing-agent");
    });

    it("should find agentId from parent span for tool calls", () => {
      const parentSpan = createMockSpan({
        name: "ai.generateText",
        spanContext: () => ({
          traceId: "trace-123",
          spanId: "parent-span-123",
          traceFlags: 0,
          isRemote: false,
        }),
        attributes: {
          "ai.telemetry.metadata.agentId": "data-collector",
        },
      });

      const toolSpan = createMockSpan({
        name: "ai.toolCall",
        parentSpanId: "parent-span-123",
        attributes: {
          "ai.toolCall.name": "searchDatabase",
        },
      });

      const result = (exporter as any).extractAgentIdFromSpan(toolSpan, [parentSpan, toolSpan]);
      expect(result).toBe("data-collector");
    });

    it("should fall back to default agentId when no parent found", () => {
      const toolSpan = createMockSpan({
        name: "ai.toolCall",
        parentSpanId: "missing-parent-123",
        attributes: {
          "ai.toolCall.name": "searchDatabase",
        },
      });

      const result = (exporter as any).extractAgentIdFromSpan(toolSpan, [toolSpan]);
      expect(result).toBe("ai-assistant");
    });

    it("should find agentId from closest generation span when parent not found", () => {
      const generationSpan = createMockSpan({
        name: "ai.generateText",
        startTime: [1000, 0],
        spanContext: () => ({
          traceId: "trace-123",
          spanId: "generation-span-123",
          traceFlags: 0,
          isRemote: false,
        }),
        attributes: {
          "ai.telemetry.metadata.agentId": "research-agent",
        },
      });

      const toolSpan = createMockSpan({
        name: "ai.toolCall",
        startTime: [1001, 0], // 1ns after generation span
        parentSpanId: "missing-parent-123",
        attributes: {
          "ai.toolCall.name": "searchDatabase",
        },
      });

      const result = (exporter as any).extractAgentIdFromSpan(toolSpan, [generationSpan, toolSpan]);
      expect(result).toBe("research-agent");
    });
  });

  describe("Multi-Agent Discovery", () => {
    it("should discover multiple agents in a trace", () => {
      const mainAgentSpan = createMockSpan({
        name: "ai.generateText",
        attributes: {
          "ai.telemetry.metadata.agentId": "marketing-agent",
        },
      });

      const subAgentSpan = createMockSpan({
        name: "ai.generateText",
        attributes: {
          "ai.telemetry.metadata.agentId": "quality-checker",
          "ai.telemetry.metadata.parentAgentId": "marketing-agent",
        },
      });

      const agents = (exporter as any).discoverAgentsInTrace([mainAgentSpan, subAgentSpan]);

      expect(agents.size).toBe(2);
      expect(agents.has("marketing-agent")).toBe(true);
      expect(agents.has("quality-checker")).toBe(true);

      const qualityChecker = agents.get("quality-checker");
      expect(qualityChecker.parentAgentId).toBe("marketing-agent");
    });

    it("should handle agents without parent relationships", () => {
      const agentSpan = createMockSpan({
        name: "ai.generateText",
        attributes: {
          "ai.telemetry.metadata.agentId": "standalone-agent",
        },
      });

      const agents = (exporter as any).discoverAgentsInTrace([agentSpan]);

      expect(agents.size).toBe(1);
      const agent = agents.get("standalone-agent");
      expect(agent.parentAgentId).toBeUndefined();
    });
  });

  describe("Tool Span Processing", () => {
    it("should process tool spans immediately with default agent when parent not found", async () => {
      const toolSpan = createMockSpan({
        name: "ai.toolCall",
        parentSpanId: "missing-parent-123",
        attributes: {
          "ai.toolCall.name": "searchDatabase",
        },
      });

      const callback = jest.fn();

      // This should process the tool span immediately with default agent
      exporter.export([toolSpan], callback);

      // Allow async processing to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should use default agent and create tool events
      expect(mockSdk.addEventToTrace).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          name: "tool:start",
          metadata: expect.objectContaining({
            displayName: "searchDatabase",
            agentId: "ai-assistant", // Default agent
          }),
        }),
      );

      expect(callback).toHaveBeenCalledWith({ code: ExportResultCode.SUCCESS });
    });

    it("should find parent agent and process tool spans correctly", async () => {
      const parentSpan = createMockSpan({
        name: "ai.generateText",
        spanContext: () => ({
          traceId: "trace-123",
          spanId: "parent-span-123",
          traceFlags: 0,
          isRemote: false,
        }),
        attributes: {
          "ai.telemetry.metadata.agentId": "data-collector",
        },
      });

      const toolSpan = createMockSpan({
        name: "ai.toolCall",
        parentSpanId: "parent-span-123",
        spanContext: () => ({
          traceId: "trace-123",
          spanId: "tool-span-123",
          traceFlags: 0,
          isRemote: false,
        }),
        attributes: {
          "ai.toolCall.name": "searchDatabase",
        },
      });

      const callback = jest.fn();

      // Export both spans together
      exporter.export([parentSpan, toolSpan], callback);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Check that tool events were created for the correct agent
      expect(mockSdk.addEventToTrace).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          name: "tool:start",
          metadata: expect.objectContaining({
            displayName: "searchDatabase",
            agentId: "data-collector",
          }),
        }),
      );
    });
  });

  describe("Event Propagation to Parent Agents", () => {
    it("should propagate tool events to parent agent history", async () => {
      const parentSpan = createMockSpan({
        name: "ai.generateText",
        spanContext: () => ({
          traceId: "trace-123",
          spanId: "parent-span-123",
          traceFlags: 0,
          isRemote: false,
        }),
        attributes: {
          "ai.telemetry.metadata.agentId": "marketing-agent",
        },
      });

      const childSpan = createMockSpan({
        name: "ai.generateText",
        spanContext: () => ({
          traceId: "trace-123",
          spanId: "child-span-123",
          traceFlags: 0,
          isRemote: false,
        }),
        attributes: {
          "ai.telemetry.metadata.agentId": "quality-checker",
          "ai.telemetry.metadata.parentAgentId": "marketing-agent",
        },
      });

      const toolSpan = createMockSpan({
        name: "ai.toolCall",
        parentSpanId: "child-span-123",
        attributes: {
          "ai.toolCall.name": "analyzeQuality",
        },
      });

      const callback = jest.fn();

      exporter.export([parentSpan, childSpan, toolSpan], callback);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify that tool event was propagated to parent with correct metadata
      expect(mockSdk.addEventToTrace).toHaveBeenCalledWith(
        expect.any(String), // parent history ID
        expect.objectContaining({
          name: "tool:start",
          metadata: expect.objectContaining({
            fromChildAgent: "quality-checker",
            originalAgentId: "quality-checker",
            // Should NOT have agentId: 'marketing-agent' (this was the bug)
          }),
        }),
      );
    });

    it("should preserve original agentId in propagated events", async () => {
      // Mock the global agent histories for cross-trace lookup
      const globalAgentHistories = new Map([["marketing-agent", "parent-history-123"]]);
      (exporter as any).globalAgentHistories = globalAgentHistories;

      const childAgentSpan = createMockSpan({
        name: "ai.generateText",
        spanContext: () => ({
          traceId: "trace-123",
          spanId: "child-agent-span",
          traceFlags: 0,
          isRemote: false,
        }),
        attributes: {
          "ai.telemetry.metadata.agentId": "quality-checker",
          "ai.telemetry.metadata.parentAgentId": "marketing-agent",
        },
      });

      const toolSpan = createMockSpan({
        name: "ai.toolCall",
        parentSpanId: "child-agent-span",
        attributes: {
          "ai.toolCall.name": "analyzeQuality",
        },
      });

      const callback = jest.fn();

      exporter.export([childAgentSpan, toolSpan], callback);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Find calls to addEventToTrace that include fromChildAgent and are tool events
      const propagatedToolCalls = mockSdk.addEventToTrace.mock.calls.filter(
        (call: any) =>
          (call[1].metadata as any)?.fromChildAgent && call[1].name?.startsWith("tool"),
      );

      expect(propagatedToolCalls.length).toBeGreaterThan(0);

      // Verify the propagated tool event preserves original agentId
      propagatedToolCalls.forEach((call: any) => {
        const event = call[1];
        const metadata = event.metadata as any;
        expect(metadata.fromChildAgent).toBe("quality-checker");
        expect(metadata.originalAgentId).toBe("quality-checker");
        // Tool events should keep agentId as the agent that actually used the tool
        expect(metadata.agentId).toBe("quality-checker");
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle spans with error status", async () => {
      const errorSpan = createMockSpan({
        name: "ai.generateText",
        status: { code: 2, message: "Test error" }, // ERROR status
        attributes: {
          "ai.telemetry.metadata.agentId": "error-agent",
        },
      });

      const callback = jest.fn();

      exporter.export([errorSpan], callback);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should create error event
      expect(mockSdk.addEventToTrace).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          name: "agent:error",
          status: "error",
          error: expect.objectContaining({
            message: "Test error",
          }),
        }),
      );
    });

    it("should handle export errors gracefully", async () => {
      // Mock SDK to throw error
      mockSdk.trace.mockRejectedValueOnce(new Error("API Error"));

      const span = createMockSpan({
        name: "ai.generateText",
        attributes: {
          "ai.telemetry.metadata.agentId": "test-agent",
        },
      });

      const callback = jest.fn();

      exporter.export([span], callback);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ExportResultCode.FAILED,
          error: expect.any(Error),
        }),
      );
    });
  });

  describe("Memory Management", () => {
    it("should clear all caches on force flush", async () => {
      // Add some data to caches and traces
      (exporter as any).activeHistories.set("test-key", "test-value");
      (exporter as any).activeTraces.set("test-key", mockTrace);
      (exporter as any).toolSpanAgentCache.set("span-123", "agent-123");
      (exporter as any).globalAgentHistories.set("agent-123", "history-123");

      await exporter.forceFlush();

      // Verify trace.end() was called
      expect(mockTrace.end).toHaveBeenCalledTimes(1);

      expect((exporter as any).activeHistories.size).toBe(0);
      expect((exporter as any).activeTraces.size).toBe(0);
      expect((exporter as any).toolSpanAgentCache.size).toBe(0);
      expect((exporter as any).globalAgentHistories.size).toBe(0);
    });

    it("should clear all caches on shutdown", async () => {
      // Add some data to caches and traces
      (exporter as any).activeHistories.set("test-key", "test-value");
      (exporter as any).activeTraces.set("test-key", mockTrace);
      (exporter as any).toolSpanAgentCache.set("span-123", "agent-123");
      (exporter as any).globalAgentHistories.set("agent-123", "history-123");

      await exporter.shutdown();

      // Verify trace.end() was called
      expect(mockTrace.end).toHaveBeenCalledTimes(1);

      expect((exporter as any).activeHistories.size).toBe(0);
      expect((exporter as any).activeTraces.size).toBe(0);
      expect((exporter as any).toolSpanAgentCache.size).toBe(0);
      expect((exporter as any).globalAgentHistories.size).toBe(0);
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete multi-agent workflow", async () => {
      // Create a realistic multi-agent scenario
      const mainAgentSpan = createMockSpan({
        name: "ai.generateText",
        startTime: [1000, 0],
        endTime: [1002, 0],
        spanContext: () => ({
          traceId: "trace-123",
          spanId: "main-agent-span",
          traceFlags: 0,
          isRemote: false,
        }),
        attributes: {
          "ai.telemetry.metadata.agentId": "marketing-agent",
          "ai.prompt.messages": JSON.stringify([
            { role: "user", content: "Create marketing copy" },
          ]),
          "ai.response.text": "Great marketing copy!",
        },
      });

      const subAgentSpan = createMockSpan({
        name: "ai.generateText",
        startTime: [1001, 0],
        endTime: [1003, 0],
        spanContext: () => ({
          traceId: "trace-123",
          spanId: "sub-agent-span",
          traceFlags: 0,
          isRemote: false,
        }),
        attributes: {
          "ai.telemetry.metadata.agentId": "quality-checker",
          "ai.telemetry.metadata.parentAgentId": "marketing-agent",
          "ai.response.object": JSON.stringify({ hasCallToAction: true, score: 8 }),
        },
      });

      const toolSpan = createMockSpan({
        name: "ai.toolCall",
        startTime: [1001, 500000000], // 0.5s after sub-agent start
        endTime: [1002, 500000000],
        parentSpanId: "sub-agent-span",
        spanContext: () => ({
          traceId: "trace-123",
          spanId: "tool-span",
          traceFlags: 0,
          isRemote: false,
        }),
        attributes: {
          "ai.toolCall.name": "qualityAnalysis",
          "ai.toolCall.args": JSON.stringify({ text: "Great marketing copy!" }),
          "ai.toolCall.result": JSON.stringify({ score: 8, recommendations: [] }),
        },
      });

      const callback = jest.fn();

      exporter.export([mainAgentSpan, subAgentSpan, toolSpan], callback);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify histories were created
      expect(mockSdk.trace).toHaveBeenCalledTimes(2); // main + sub agent

      // Verify agent events were created
      expect(mockSdk.addEventToTrace).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ name: "agent:start" }),
      );

      // Verify tool events were created and propagated
      const toolStartCalls = mockSdk.addEventToTrace.mock.calls.filter(
        (call: any) => call[1].name === "tool:start",
      );
      expect(toolStartCalls.length).toBe(2); // once for sub-agent, once propagated to main

      // Verify correct agent attribution in propagated events
      const propagatedToolEvent = toolStartCalls.find(
        (call: any) => (call[1].metadata as any)?.fromChildAgent === "quality-checker",
      );
      expect(propagatedToolEvent).toBeDefined();
      if (propagatedToolEvent) {
        expect((propagatedToolEvent[1].metadata as any).originalAgentId).toBe("quality-checker");
      }

      expect(callback).toHaveBeenCalledWith({ code: ExportResultCode.SUCCESS });
    });
  });

  describe("Deep Nested Multi-Agent Hierarchies (3+ Levels)", () => {
    it("should handle 3-level agent hierarchy with recursive propagation", async () => {
      // Level 1: Master Coordinator
      const masterSpan = createMockSpan({
        name: "ai.generateText",
        spanContext: () => ({
          traceId: "trace-123",
          spanId: "master-span",
          traceFlags: 0,
          isRemote: false,
        }),
        attributes: {
          "ai.telemetry.metadata.agentId": "master-coordinator",
          "ai.response.text": "Master plan created",
        },
      });

      // Level 2: Division Manager
      const divisionSpan = createMockSpan({
        name: "ai.generateText",
        spanContext: () => ({
          traceId: "trace-123",
          spanId: "division-span",
          traceFlags: 0,
          isRemote: false,
        }),
        attributes: {
          "ai.telemetry.metadata.agentId": "division-manager",
          "ai.telemetry.metadata.parentAgentId": "master-coordinator",
          "ai.response.text": "Division strategy",
        },
      });

      // Level 3: Technical Specialist
      const specialistSpan = createMockSpan({
        name: "ai.generateText",
        spanContext: () => ({
          traceId: "trace-123",
          spanId: "specialist-span",
          traceFlags: 0,
          isRemote: false,
        }),
        attributes: {
          "ai.telemetry.metadata.agentId": "technical-specialist",
          "ai.telemetry.metadata.parentAgentId": "division-manager",
          "ai.response.text": "Technical implementation",
        },
      });

      // Level 3: Tool usage by specialist
      const toolSpan = createMockSpan({
        name: "ai.toolCall",
        parentSpanId: "specialist-span",
        spanContext: () => ({
          traceId: "trace-123",
          spanId: "tool-span",
          traceFlags: 0,
          isRemote: false,
        }),
        attributes: {
          "ai.toolCall.name": "technicalAnalysis",
          "ai.toolCall.args": JSON.stringify({ requirement: "test", complexity: "high" }),
          "ai.toolCall.result": JSON.stringify({ analysis: "complete", hours: 40 }),
        },
      });

      const callback = jest.fn();

      exporter.export([masterSpan, divisionSpan, specialistSpan, toolSpan], callback);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify 3 agent histories were created
      expect(mockSdk.trace).toHaveBeenCalledTimes(3);

      // Verify tool events were created for the specialist
      const toolStartCalls = mockSdk.addEventToTrace.mock.calls.filter(
        (call: any) => call[1].name === "tool:start",
      );
      expect(toolStartCalls.length).toBeGreaterThan(0);

      // Verify recursive propagation: tool event should appear in ALL ancestor histories
      // But the original tool event doesn't have originalAgentId metadata, so we check all tool:start events
      const allToolStartCalls = mockSdk.addEventToTrace.mock.calls.filter(
        (call: any) => call[1].name === "tool:start",
      );

      // Should have: original (1) + propagated to division-manager (1) + propagated to master-coordinator (1) = 3 total
      expect(allToolStartCalls.length).toBe(3);

      expect(callback).toHaveBeenCalledWith({ code: ExportResultCode.SUCCESS });
    });

    it("should prevent infinite recursion in propagation", async () => {
      // Create a potential circular reference scenario (should not happen in real usage but good to test)
      const span1 = createMockSpan({
        name: "ai.generateText",
        attributes: {
          "ai.telemetry.metadata.agentId": "agent-1",
          "ai.telemetry.metadata.parentAgentId": "agent-2",
        },
      });

      const span2 = createMockSpan({
        name: "ai.generateText",
        attributes: {
          "ai.telemetry.metadata.agentId": "agent-2",
          "ai.telemetry.metadata.parentAgentId": "agent-1", // Circular!
        },
      });

      const callback = jest.fn();

      // This should not crash or cause infinite recursion
      exporter.export([span1, span2], callback);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith({ code: ExportResultCode.SUCCESS });
    });

    it("should handle deep hierarchy with cross-trace propagation", async () => {
      // Setup global parent history (simulating cross-trace scenario)
      const globalAgentHistories = new Map([
        ["master-coordinator", "master-history-123"],
        ["division-manager", "division-history-456"],
      ]);
      (exporter as any).globalAgentHistories = globalAgentHistories;

      // Global parent-child relationships
      const globalParentChildMap = new Map([
        ["division-manager", "master-coordinator"],
        ["technical-specialist", "division-manager"],
      ]);
      (exporter as any).globalParentChildMap = globalParentChildMap;

      // Create a specialist span in a different trace
      const specialistSpan = createMockSpan({
        name: "ai.generateText",
        spanContext: () => ({
          traceId: "trace-456", // Different trace
          spanId: "specialist-span-456",
          traceFlags: 0,
          isRemote: false,
        }),
        attributes: {
          "ai.telemetry.metadata.agentId": "technical-specialist",
          "ai.telemetry.metadata.parentAgentId": "division-manager",
          "ai.response.text": "Cross-trace work",
        },
      });

      const callback = jest.fn();

      exporter.export([specialistSpan], callback);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify cross-trace propagation happened
      const propagatedCalls = mockSdk.addEventToTrace.mock.calls.filter(
        (call: any) => (call[1].metadata as any)?.originalAgentId === "technical-specialist",
      );

      // Should propagate to both division-manager and master-coordinator across traces
      expect(propagatedCalls.length).toBeGreaterThan(1);

      // Verify cross-trace propagation metadata
      const crossTracePropagation = propagatedCalls.find(
        (call: any) => (call[1].metadata as any)?.propagationDepth === 2,
      );
      expect(crossTracePropagation).toBeDefined();
    });

    it("should preserve original agent attribution in deep propagation", async () => {
      // Create 4-level hierarchy: master → division → team-lead → specialist
      const masterSpan = createMockSpan({
        name: "ai.generateText",
        spanContext: () => ({
          traceId: "trace-deep",
          spanId: "master-span",
          traceFlags: 0,
          isRemote: false,
        }),
        attributes: {
          "ai.telemetry.metadata.agentId": "master-coordinator",
        },
      });

      const divisionSpan = createMockSpan({
        name: "ai.generateText",
        spanContext: () => ({
          traceId: "trace-deep",
          spanId: "division-span",
          traceFlags: 0,
          isRemote: false,
        }),
        attributes: {
          "ai.telemetry.metadata.agentId": "division-manager",
          "ai.telemetry.metadata.parentAgentId": "master-coordinator",
        },
      });

      const teamLeadSpan = createMockSpan({
        name: "ai.generateText",
        spanContext: () => ({
          traceId: "trace-deep",
          spanId: "team-lead-span",
          traceFlags: 0,
          isRemote: false,
        }),
        attributes: {
          "ai.telemetry.metadata.agentId": "team-lead",
          "ai.telemetry.metadata.parentAgentId": "division-manager",
        },
      });

      const specialistSpan = createMockSpan({
        name: "ai.generateText",
        spanContext: () => ({
          traceId: "trace-deep",
          spanId: "specialist-span",
          traceFlags: 0,
          isRemote: false,
        }),
        attributes: {
          "ai.telemetry.metadata.agentId": "deep-specialist",
          "ai.telemetry.metadata.parentAgentId": "team-lead",
        },
      });

      const toolSpan = createMockSpan({
        name: "ai.toolCall",
        parentSpanId: "specialist-span",
        spanContext: () => ({
          traceId: "trace-deep",
          spanId: "deep-tool-span",
          traceFlags: 0,
          isRemote: false,
        }),
        attributes: {
          "ai.toolCall.name": "deepAnalysis",
          "ai.toolCall.result": JSON.stringify({ result: "deep analysis complete" }),
        },
      });

      const callback = jest.fn();

      exporter.export([masterSpan, divisionSpan, teamLeadSpan, specialistSpan, toolSpan], callback);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Find all tool events propagated to master coordinator (depth 3)
      const masterToolEvents = mockSdk.addEventToTrace.mock.calls.filter(
        (call: any) =>
          call[1].name === "tool:start" &&
          (call[1].metadata as any)?.propagationDepth === 3 &&
          (call[1].metadata as any)?.originalAgentId === "deep-specialist",
      );

      expect(masterToolEvents.length).toBe(1);

      const masterEvent = masterToolEvents[0];
      const metadata = masterEvent[1].metadata as any;

      // Verify deep propagation preserved original attribution
      expect(metadata.originalAgentId).toBe("deep-specialist");
      expect(metadata.agentId).toBe("deep-specialist"); // Should NOT be overwritten
      expect(metadata.propagationDepth).toBe(3);
      expect(metadata.propagationPath).toContain("deep-specialist → ... → master-coordinator");
    });

    it("should handle propagation depth limits gracefully", async () => {
      // Test the safety limit of 10 levels
      const spans = [];

      // Create a very deep hierarchy (15 levels, should stop at 10)
      for (let i = 0; i < 15; i++) {
        const span = createMockSpan({
          name: "ai.generateText",
          spanContext: () => ({
            traceId: "trace-deep-limit",
            spanId: `span-${i}`,
            traceFlags: 0,
            isRemote: false,
          }),
          attributes: {
            "ai.telemetry.metadata.agentId": `agent-level-${i}`,
            ...(i > 0 && { "ai.telemetry.metadata.parentAgentId": `agent-level-${i - 1}` }),
          },
        });
        spans.push(span);
      }

      // Add a tool at the deepest level
      const deepToolSpan = createMockSpan({
        name: "ai.toolCall",
        parentSpanId: "span-14",
        attributes: {
          "ai.toolCall.name": "veryDeepTool",
        },
      });
      spans.push(deepToolSpan);

      const callback = jest.fn();

      exporter.export(spans, callback);
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Should complete without errors despite deep hierarchy
      expect(callback).toHaveBeenCalledWith({ code: ExportResultCode.SUCCESS });

      // Verify max depth was respected (should not have propagated beyond 10 levels)
      const allToolEvents = mockSdk.addEventToTrace.mock.calls.filter(
        (call: any) => call[1].name === "tool:start",
      );

      // Should have tool events but not more than 11 (original + 10 propagations)
      expect(allToolEvents.length).toBeLessThanOrEqual(11);
    });
  });
});

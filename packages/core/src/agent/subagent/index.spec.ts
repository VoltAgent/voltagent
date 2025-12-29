import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Agent } from "../agent";
import { AGENT_METADATA_CONTEXT_KEY } from "../memory-persist-queue";
import { SubAgentManager } from "./index";
import {
  createMockAgent,
  createMockAgentWithStubs,
  createMockStream,
  mockStreamEvents,
  subAgentFixtures,
} from "./test-utils";

describe("SubAgentManager", () => {
  let subAgentManager: SubAgentManager;
  let mockAgent1: Agent;
  let mockAgent2: Agent;
  let mockSourceAgent: Agent;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create fresh instances for each test
    subAgentManager = new SubAgentManager("Supervisor", [], {
      customGuidelines: ["Be helpful", "Be concise"],
    });

    // Create properly typed mock agents with stubs
    mockAgent1 = createMockAgentWithStubs({
      id: "agent1",
      name: "Math Agent",
      instructions: "You are a math expert",
    });

    mockAgent2 = createMockAgentWithStubs({
      id: "agent2",
      name: "Writing Agent",
      instructions: "You are a writing expert",
    });

    mockSourceAgent = createMockAgent({
      id: "source",
      name: "Source Agent",
      instructions: "You delegate tasks",
    });
  });

  describe("constructor", () => {
    it("should initialize with empty sub-agents when none provided", () => {
      const manager = new SubAgentManager("Test");
      expect(manager.hasSubAgents()).toBe(false);
      expect(manager.getSubAgentDetails()).toEqual([]);
    });

    it("should initialize with provided sub-agents", () => {
      const manager = new SubAgentManager("Test", [mockAgent1, mockAgent2]);
      expect(manager.hasSubAgents()).toBe(true);
      expect(manager.getSubAgentDetails()).toHaveLength(2);
    });
  });

  describe("addSubAgent", () => {
    it("should add a new sub-agent", () => {
      expect(subAgentManager.hasSubAgents()).toBe(false);
      subAgentManager.addSubAgent(mockAgent1);
      expect(subAgentManager.hasSubAgents()).toBe(true);

      const details = subAgentManager.getSubAgentDetails();
      expect(details).toHaveLength(1);
      expect(details[0].name).toBe("Math Agent");
    });

    it("should handle different SubAgentConfig types", () => {
      // Direct agent
      subAgentManager.addSubAgent(mockAgent1);

      // StreamText config
      subAgentManager.addSubAgent(subAgentFixtures.streamText(mockAgent2));

      // GenerateText config
      const generateAgent = createMockAgent({ name: "Generate Agent" });
      subAgentManager.addSubAgent(subAgentFixtures.generateText(generateAgent));

      expect(subAgentManager.getSubAgentDetails()).toHaveLength(3);
    });
  });

  describe("removeSubAgent", () => {
    beforeEach(() => {
      subAgentManager.addSubAgent(mockAgent1);
      subAgentManager.addSubAgent(mockAgent2);
    });

    it("should remove an existing sub-agent", () => {
      expect(subAgentManager.hasSubAgents()).toBe(true);
      subAgentManager.removeSubAgent("agent1");

      const details = subAgentManager.getSubAgentDetails();
      expect(details).toHaveLength(1);
      expect(details[0].name).toBe("Writing Agent");
    });

    it("should handle removing non-existent agent gracefully", () => {
      subAgentManager.removeSubAgent("non-existent");
      expect(subAgentManager.getSubAgentDetails()).toHaveLength(2);
    });
  });

  describe("hasSubAgents", () => {
    it("should return false when no sub-agents", () => {
      expect(subAgentManager.hasSubAgents()).toBe(false);
    });

    it("should return true when has sub-agents", () => {
      subAgentManager.addSubAgent(mockAgent1);
      expect(subAgentManager.hasSubAgents()).toBe(true);
    });
  });

  describe("getSubAgentDetails", () => {
    it("should return details of all sub-agents", () => {
      subAgentManager.addSubAgent(mockAgent1);
      subAgentManager.addSubAgent(mockAgent2);

      const details = subAgentManager.getSubAgentDetails();

      expect(details).toHaveLength(2);
      expect(details[0]).toMatchObject({
        id: "agent1",
        name: "Math Agent",
        instructions: "You are a math expert",
        status: "idle",
      });
      expect(details[1]).toMatchObject({
        id: "agent2",
        name: "Writing Agent",
        instructions: "You are a writing expert",
        status: "idle",
      });
    });
  });

  describe("generateSupervisorSystemMessage", () => {
    it("should return base instructions when no sub-agents", () => {
      const message = subAgentManager.generateSupervisorSystemMessage("Base instructions", "");

      // When no sub-agents, just returns base instructions
      expect(message).toBe("Base instructions");
    });

    it("should include sub-agent list in default template", () => {
      subAgentManager.addSubAgent(mockAgent1);
      subAgentManager.addSubAgent(mockAgent2);

      const message = subAgentManager.generateSupervisorSystemMessage("Base instructions", "");

      expect(message).toContain("<specialized_agents>");
      expect(message).toContain("Math Agent");
      expect(message).toContain("Writing Agent");
      expect(message).toContain("You are a math expert");
      expect(message).toContain("You are a writing expert");
    });

    it("should prefer purpose over instructions when listing specialized agents", () => {
      subAgentManager.addSubAgent(
        createMockAgentWithStubs({
          id: "agent-purpose",
          name: "Purpose Agent",
          purpose: "Summarize support tickets",
          instructions: "This verbose instruction should not be shown",
        }),
      );

      const message = subAgentManager.generateSupervisorSystemMessage("Base instructions", "");

      expect(message).toContain("Summarize support tickets");
      expect(message).not.toContain("This verbose instruction should not be shown");
    });

    it("should use custom system message when provided", () => {
      // Need at least one agent for supervisor config to apply
      subAgentManager.addSubAgent(mockAgent1);

      const config = {
        systemMessage: "Custom supervisor message",
        includeAgentsMemory: false,
      };

      const message = subAgentManager.generateSupervisorSystemMessage(
        "Base instructions",
        "",
        config,
      );

      expect(message).toBe("Custom supervisor message");
    });

    it("should include agents memory when configured", () => {
      // Need at least one agent for supervisor config to apply
      subAgentManager.addSubAgent(mockAgent1);

      const config = {
        systemMessage: "Custom message",
        includeAgentsMemory: true,
      };

      const message = subAgentManager.generateSupervisorSystemMessage(
        "Base instructions",
        "Previous interactions history",
        config,
      );

      // Should include both custom message and memory section
      expect(message).toContain("Custom message");
      expect(message).toContain("Previous interactions history");
    });

    it("should use custom guidelines when provided", () => {
      // Custom guidelines are only applied when there are agents
      subAgentManager.addSubAgent(mockAgent1);

      // Pass custom guidelines as config parameter
      const message = subAgentManager.generateSupervisorSystemMessage("Base instructions", "", {
        customGuidelines: ["Be helpful", "Be concise"],
      });

      // Check that custom guidelines are included
      expect(message).toContain("Be helpful");
      expect(message).toContain("Be concise");
    });

    it("should generate consistent snapshot", () => {
      subAgentManager.addSubAgent(mockAgent1);
      subAgentManager.addSubAgent(mockAgent2);

      const message = subAgentManager.generateSupervisorSystemMessage(
        "You are a supervisor agent",
        "Previous agent memory",
        { includeAgentsMemory: true },
      );

      expect(message).toMatchSnapshot();
    });
  });

  describe("calculateMaxSteps", () => {
    it("should return supervisor maxSteps when provided", () => {
      const steps = subAgentManager.calculateMaxSteps(50);
      expect(steps).toBe(50);
    });

    it("should return default when no agents and no parameters", () => {
      const steps = subAgentManager.calculateMaxSteps();
      expect(steps).toBe(10);
    });

    it("should return calculated value based on sub-agent count", () => {
      subAgentManager.addSubAgent(mockAgent1);
      subAgentManager.addSubAgent(mockAgent2);

      const steps = subAgentManager.calculateMaxSteps();
      expect(steps).toBe(20); // 10 * 2 agents
    });
  });

  describe("handoffTask", () => {
    it("should handoff task to target agent with proper message format", async () => {
      const streamTextSpy = vi.spyOn(mockAgent1, "streamText");

      const result = await subAgentManager.handoffTask({
        task: "Solve this math problem",
        targetAgent: mockAgent1,
        context: new Map([["problem", "2+2"]]),
        sharedContext: [],
      });

      // Verify streamText was called
      expect(streamTextSpy).toHaveBeenCalledTimes(1);

      // Check the messages passed to streamText
      const [messages] = streamTextSpy.mock.calls[0];
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(
        expect.objectContaining({
          role: "user",
          parts: expect.arrayContaining([
            expect.objectContaining({
              type: "text",
              text: expect.stringContaining("Solve this math problem"),
            }),
          ]),
        }),
      );

      // Verify result structure
      expect(result).toEqual({
        result: "Hello from Math Agent",
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "user" }),
          expect.objectContaining({ role: "assistant" }),
        ]),
        usage: expect.objectContaining({
          inputTokens: expect.any(Number),
          outputTokens: expect.any(Number),
          totalTokens: expect.any(Number),
        }),
      });
    });

    it("should handle different SubAgentConfig types", async () => {
      // Test with streamText config
      const streamConfig = subAgentFixtures.streamText(mockAgent1);
      await subAgentManager.handoffTask({
        task: "Stream task",
        targetAgent: streamConfig,
      });

      expect(mockAgent1.streamText).toHaveBeenCalled();

      // Test with generateText config
      const generateConfig = subAgentFixtures.generateText(mockAgent2);
      await subAgentManager.handoffTask({
        task: "Generate task",
        targetAgent: generateConfig,
      });

      expect(mockAgent2.generateText).toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      const failingAgent = createMockAgent({ name: "Failing Agent" });
      vi.spyOn(failingAgent, "streamText").mockRejectedValue(new Error("Stream failed"));

      const result = await subAgentManager.handoffTask({
        task: "Will fail",
        targetAgent: failingAgent,
      });

      expect(result.result).toContain("Error in delegating task");
      expect(result.result).toContain("Stream failed");
    });

    it.skip("should call onHandoff hook with correct arguments when target agent has hooks", async () => {
      // This test is skipped as the feature is commented out in implementation
    });
  });

  describe("handoffToMultiple", () => {
    it("should handoff task to multiple agents in parallel", async () => {
      const spy1 = vi.spyOn(mockAgent1, "streamText");
      const spy2 = vi.spyOn(mockAgent2, "streamText");

      const results = await subAgentManager.handoffToMultiple({
        task: "Analyze this data",
        targetAgents: [mockAgent1, mockAgent2],
        context: new Map([["data", "test"]]),
        sharedContext: [],
      });

      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(
        expect.objectContaining({
          result: "Hello from Math Agent",
          messages: expect.any(Array),
        }),
      );
      expect(results[1]).toEqual(
        expect.objectContaining({
          result: "Hello from Writing Agent",
          messages: expect.any(Array),
        }),
      );
    });

    it("should handle partial failures in parallel execution", async () => {
      const failingAgent = createMockAgent({ name: "Failing Agent" });
      vi.spyOn(failingAgent, "streamText").mockRejectedValue(new Error("Failed"));

      const results = await subAgentManager.handoffToMultiple({
        task: "Test",
        targetAgents: [mockAgent1, failingAgent],
      });

      expect(results).toHaveLength(2);
      expect(results[0].result).toContain("Math Agent");
      expect(results[1].result).toContain("Error");
    });
  });

  describe("createDelegateTool", () => {
    const mockDelegateToolOptions = {
      sourceAgent: mockSourceAgent,
      currentHistoryEntryId: "history-123",
      maxSteps: 10,
    };

    it("should create a delegate tool with correct configuration", () => {
      subAgentManager.addSubAgent(mockAgent1);
      subAgentManager.addSubAgent(mockAgent2);

      const tool = subAgentManager.createDelegateTool(mockDelegateToolOptions);

      expect(tool.name).toBe("delegate_task");
      expect(tool.description).toContain("Delegate a task to one or more specialized agents");

      // Check Zod schema shape
      const shape = (tool.parameters as any).shape;
      expect(shape).toHaveProperty("targetAgents");
      expect(shape).toHaveProperty("task");
      expect(shape).toHaveProperty("context");
    });

    it("should validate and execute delegation with valid agents", async () => {
      subAgentManager.addSubAgent(mockAgent1);
      const tool = subAgentManager.createDelegateTool(mockDelegateToolOptions);

      const result = await tool.execute({
        targetAgents: ["Math Agent"],
        task: "Calculate 2+2",
        context: { problem: "simple math" },
      });

      // Always returns array for consistent API
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          agentName: "Math Agent",
          response: expect.stringContaining("Math Agent"),
          usage: expect.any(Object),
        }),
      );
    });

    it("should return error when no valid agents found", async () => {
      const tool = subAgentManager.createDelegateTool(mockDelegateToolOptions);

      const result = await tool.execute({
        targetAgents: ["NonExistent Agent"],
        task: "Test task",
      });

      expect(result).toHaveProperty("error");
      expect(result.error).toContain("No valid target agents found");
    });

    it("should handle empty task gracefully", async () => {
      subAgentManager.addSubAgent(mockAgent1);
      const tool = subAgentManager.createDelegateTool(mockDelegateToolOptions);

      const result = await tool.execute({
        targetAgents: ["Math Agent"],
        task: "",
      });

      expect(result).toHaveProperty("error");
      expect(result.error).toContain("Task cannot be empty");
    });
  });

  describe("event forwarding", () => {
    it("should handle stream errors gracefully", async () => {
      const failingAgent = createMockAgent({ name: "Failing Agent" });
      vi.spyOn(failingAgent, "streamText").mockRejectedValue(new Error("Stream failed"));

      const result = await subAgentManager.handoffTask({
        task: "Test task",
        targetAgent: failingAgent,
      });

      expect(result.result).toContain("Error in delegating task");
    });

    it("should work without uiStreamWriter", async () => {
      const result = await subAgentManager.handoffTask({
        task: "Test task",
        targetAgent: mockAgent1,
        // No parentOperationContext with uiStreamWriter
      });

      expect(result.result).toBe("Hello from Math Agent");
    });

    it("should use uiStreamWriter when available", async () => {
      const mockMerge = vi.fn();
      const mockAgent = createMockAgent({ id: "test-id", name: "Test Agent" });

      const mockStream = createMockStream([mockStreamEvents.textDelta("Test")]);
      const mockToUIMessageStream = vi.fn().mockReturnValue(mockStream);

      vi.spyOn(mockAgent, "streamText").mockResolvedValue({
        fullStream: mockStream,
        toUIMessageStream: mockToUIMessageStream,
        text: Promise.resolve("Test"),
        usage: Promise.resolve({ promptTokens: 10, completionTokens: 5, totalTokens: 15 }),
      } as any);

      const operationContext = {
        systemContext: new Map([["uiStreamWriter", { merge: mockMerge }]]),
      } as any;

      await subAgentManager.handoffTask({
        task: "Test",
        targetAgent: mockAgent,
        parentOperationContext: operationContext,
      });

      expect(mockToUIMessageStream).toHaveBeenCalled();
      expect(mockMerge).toHaveBeenCalled();
    });

    it("should apply supervisor config filters", async () => {
      const mockMerge = vi.fn();

      // Create manager with specific event type configuration
      const manager = new SubAgentManager("Supervisor", [], {
        fullStreamEventForwarding: {
          types: ["text-delta", "tool-call"], // Custom filter types
        },
      });

      const mockAgent = createMockAgent({ name: "Filtered Agent" });
      const mockStream = createMockStream([
        mockStreamEvents.textDelta("Text"),
        mockStreamEvents.toolCall("id", "tool", {}),
        mockStreamEvents.finish(),
      ]);

      const mockToUIMessageStream = vi.fn().mockReturnValue(mockStream);

      vi.spyOn(mockAgent, "streamText").mockResolvedValue({
        fullStream: mockStream,
        toUIMessageStream: mockToUIMessageStream,
        text: Promise.resolve("Text"),
      } as any);

      const operationContext = {
        systemContext: new Map([["uiStreamWriter", { merge: mockMerge }]]),
      } as any;

      manager.addSubAgent(mockAgent);

      await manager.handoffTask({
        task: "Test",
        targetAgent: mockAgent,
        parentOperationContext: operationContext,
      });

      // Verify the stream was processed with filters
      expect(mockMerge).toHaveBeenCalled();
    });

    it("should forward executing sub-agent metadata to the parent fullStream", async () => {
      const forwarded: any[] = [];
      const fullStreamWriter = {
        write: vi.fn(async (chunk: any) => {
          forwarded.push(chunk);
        }),
      };

      const parentOperationContext = {
        systemContext: new Map([
          ["fullStreamWriter", fullStreamWriter],
          [AGENT_METADATA_CONTEXT_KEY, { agentId: "parent-agent", agentName: "Parent Agent" }],
        ]),
      } as any;

      const subAgent = createMockAgent({ id: "sub-agent-a", name: "Sub-Agent A" });
      const mockStream = createMockStream([
        mockStreamEvents.toolCall("call-1", "toolA", { foo: "bar" }),
        mockStreamEvents.toolResult("call-1", "toolA", { ok: true }),
      ]);

      vi.spyOn(subAgent, "streamText").mockResolvedValue({
        fullStream: mockStream,
        toUIMessageStream: vi.fn(),
        text: Promise.resolve("done"),
        usage: Promise.resolve({}),
      } as any);

      await subAgentManager.handoffTask({
        task: "Test task",
        targetAgent: subAgent,
        parentOperationContext,
      });

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(forwarded.length).toBeGreaterThanOrEqual(2);
      const toolCallPart = forwarded[0];

      expect(toolCallPart.subAgentId).toBe("sub-agent-a");
      expect(toolCallPart.subAgentName).toBe("Sub-Agent A");
      expect(toolCallPart.executingAgentId).toBe("sub-agent-a");
      expect(toolCallPart.executingAgentName).toBe("Sub-Agent A");
      expect(toolCallPart.parentAgentId).toBe("parent-agent");
      expect(toolCallPart.parentAgentName).toBe("Parent Agent");
      expect(toolCallPart.agentPath).toEqual(["Parent Agent", "Sub-Agent A"]);
    });
  });

  describe("maxSteps propagation", () => {
    it("should pass maxSteps to handoffTask", async () => {
      const spy = vi.spyOn(mockAgent1, "streamText");

      await subAgentManager.handoffTask({
        task: "Test task",
        targetAgent: mockAgent1,
        maxSteps: 25,
      });

      expect(spy).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ maxSteps: 25 }),
      );
    });

    it("should propagate maxSteps in handoffToMultiple", async () => {
      const spy1 = vi.spyOn(mockAgent1, "streamText");
      const spy2 = vi.spyOn(mockAgent2, "streamText");

      await subAgentManager.handoffToMultiple({
        task: "Test task",
        targetAgents: [mockAgent1, mockAgent2],
        maxSteps: 30,
      });

      expect(spy1).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ maxSteps: 30 }),
      );
      expect(spy2).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ maxSteps: 30 }),
      );
    });

    it("should handle undefined maxSteps", async () => {
      const spy = vi.spyOn(mockAgent1, "streamText");

      await subAgentManager.handoffTask({
        task: "Test task",
        targetAgent: mockAgent1,
        // No maxSteps provided
      });

      const callOptions = spy.mock.calls[0][1];
      expect(callOptions?.maxSteps).toBeUndefined();
    });

    it("should handle zero and negative maxSteps", async () => {
      const spy = vi.spyOn(mockAgent1, "streamText");

      // Test with zero
      await subAgentManager.handoffTask({
        task: "Test with zero",
        targetAgent: mockAgent1,
        maxSteps: 0,
      });

      expect(spy).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ maxSteps: 0 }));

      // Test with negative
      await subAgentManager.handoffTask({
        task: "Test with negative",
        targetAgent: mockAgent1,
        maxSteps: -10,
      });

      expect(spy).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ maxSteps: -10 }),
      );
    });

    it("should pass all handoff options correctly", async () => {
      const spy = vi.spyOn(mockAgent1, "streamText");

      await subAgentManager.handoffTask({
        task: "Complex task",
        targetAgent: mockAgent1,
        sourceAgent: mockSourceAgent,
        userId: "user-123",
        conversationId: "conv-456",
        maxSteps: 100,
        context: new Map([["key", "value"]]),
      });

      expect(spy).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          maxSteps: 100,
          userId: "user-123",
          conversationId: "conv-456",
          parentAgentId: "source", // sourceAgent.id
        }),
      );
    });
  });

  describe("integration scenarios", () => {
    it("should handle complex delegation chain", async () => {
      // Add multiple agents
      subAgentManager.addSubAgent(mockAgent1);
      subAgentManager.addSubAgent(mockAgent2);

      // Create delegate tool
      const tool = subAgentManager.createDelegateTool({
        sourceAgent: mockSourceAgent,
      });

      // Execute delegation to multiple agents
      const result = await tool.execute({
        targetAgents: ["Math Agent", "Writing Agent"],
        task: "Complex analysis",
        context: { type: "research" },
      });

      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        expect(result).toHaveLength(2);
        expect(result[0].agentName).toBe("Math Agent");
        expect(result[1].agentName).toBe("Writing Agent");
      }
    });

    it("should maintain context throughout delegation", async () => {
      const contextMap = new Map([
        ["session", "test-session"],
        ["user", "test-user"],
      ]);

      const spy = vi.spyOn(mockAgent1, "streamText");

      await subAgentManager.handoffTask({
        task: "Contextual task",
        targetAgent: mockAgent1,
        context: contextMap,
        sourceAgent: mockSourceAgent,
      });

      // Verify context is included in the message
      const messages = spy.mock.calls[0][0];
      const firstMessage = messages[0];
      if (typeof firstMessage !== "string" && "parts" in firstMessage) {
        const textPart = firstMessage.parts[0];
        if ("text" in textPart) {
          expect(textPart.text).toContain("session");
          expect(textPart.text).toContain("test-session");
        }
      }
    });
  });
});

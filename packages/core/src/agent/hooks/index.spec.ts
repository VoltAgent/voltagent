import { z } from "zod";
import { type AgentHooks, createHooks } from ".";
import { createTool, type AgentTool } from "../../tool";
import { Agent } from "../index";
// Import only OperationContext
import type { OperationContext } from "../types";

// Removed unused mock types

// Mock LLM provider
class MockProvider {
  async generateText() {
    return { text: "Mock response" };
  }

  getModelIdentifier() {
    return "mock-model";
  }
}

// Create a test agent
const createTestAgent = (name: string) => {
  return new Agent({
    name,
    description: `Test ${name}`,
    llm: new MockProvider() as any,
    model: "mock-model",
  });
};

// Create mock OperationContext for tests
const createMockContext = (id = "mock-op-1") => {
  // No explicit type annotation here
  const mockHistoryEntry = {
    id: `history-${id}`,
    timestamp: new Date(),
    input: "test input",
    output: "",
    status: "working", // Use a valid AgentStatus string literal
    steps: [] as any[],
    events: [] as any[],
    agentId: "test-agent",
    conversationId: "conv-1",
  };

  // Cast the return object to OperationContext to satisfy the usage
  return {
    operationId: id,
    userContext: new Map<string | symbol, any>(),
    historyEntry: mockHistoryEntry,
    eventUpdaters: new Map<string, any>(),
    isActive: true,
  } as OperationContext; // Add cast here
};

describe("Agent Hooks Functionality", () => {
  let hooks: AgentHooks;
  let agent: Agent<any>;
  let sourceAgent: Agent<any>;
  let tool: AgentTool;

  beforeEach(() => {
    hooks = createHooks();
    agent = createTestAgent("TestAgent");
    sourceAgent = createTestAgent("SourceAgent");
    tool = createTool({
      name: "test-tool",
      description: "A test tool",
      parameters: z.object({}),
      execute: jest.fn().mockResolvedValue("Tool result"),
    });

    // Set hooks on the agent
    agent.hooks = hooks;
  });

  describe("onStart", () => {
    it("should call onStart when agent starts generating", async () => {
      // Create hooks with a spy
      const onStartSpy = jest.fn();
      agent.hooks = createHooks({
        onStart: onStartSpy,
      });

      // Call generateText to trigger the hook
      await agent.generateText("Test input");

      // Verify onStart was called with the agent
      expect(onStartSpy).toHaveBeenCalledWith(agent);
    });
  });

  describe("onEnd", () => {
    it("should call onEnd when agent completes generating", async () => {
      // Create hooks with a spy
      const onEndSpy = jest.fn();
      agent.hooks = createHooks({
        onEnd: onEndSpy,
      });

      // Call generateText to trigger the hook
      const response = await agent.generateText("Test input");

      // Verify onEnd was called with the agent and response
      expect(onEndSpy).toHaveBeenCalledWith(agent, response);
    });
  });

  describe("onHandoff", () => {
    it("should call onHandoff when agent is handed off to", async () => {
      // Create hooks with a spy
      const onHandoffSpy = jest.fn();
      agent.hooks = createHooks({
        onHandoff: onHandoffSpy,
      });

      // Simulate a handoff (by calling the hook directly)
      await agent.hooks.onHandoff?.(agent, sourceAgent);

      // Verify onHandoff was called with the agent and source agent
      expect(onHandoffSpy).toHaveBeenCalledWith(agent, sourceAgent);
    });
  });

  describe("onToolStart & onToolEnd", () => {
    it("should call onToolStart and onToolEnd when using tools", async () => {
      // Create hooks with spies
      const onToolStartSpy = jest.fn();
      const onToolEndSpy = jest.fn();
      agent.hooks = createHooks({
        onToolStart: onToolStartSpy,
        onToolEnd: onToolEndSpy,
      });

      // Add a test tool to the agent
      agent.addItems([tool]);

      // Create a mock context for this test
      const mockContext = createMockContext();

      // Directly execute the hooks to test their functionality
      // Pass the mock context
      await agent.hooks.onToolStart?.(agent, tool, mockContext);
      // Pass the mock context
      await agent.hooks.onToolEnd?.(agent, tool, "Tool result", mockContext);

      // Verify hooks were called with correct arguments, including the context
      expect(onToolStartSpy).toHaveBeenCalledWith(agent, tool, mockContext);
      expect(onToolEndSpy).toHaveBeenCalledWith(agent, tool, "Tool result", mockContext);
    });
  });
});

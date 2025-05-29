import { z } from "zod";
import { type AgentHooks, createHooks } from ".";
import { createTool, type AgentTool } from "../../tool";
import { Agent } from "../index";
// Import only OperationContext and VoltAgentError
import type { OperationContext, VoltAgentError } from "../types";

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
    startTime: new Date(),
    input: "test input",
    output: "",
    status: "working", // Use a valid AgentStatus string literal
    steps: [] as any[],
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
      const onStartSpy = jest.fn();
      agent.hooks = createHooks({ onStart: onStartSpy });

      await agent.generateText("Test input");

      // Verify onStart was called with the correct object structure
      expect(onStartSpy).toHaveBeenCalledWith({
        agent: agent,
        context: expect.objectContaining({ operationId: expect.any(String) }), // Check for context object
      });
    });
  });

  describe("onEnd", () => {
    it("should call onEnd when agent completes generating successfully", async () => {
      const onEndSpy = jest.fn();
      agent.hooks = createHooks({ onEnd: onEndSpy });

      const response = await agent.generateText("Test input"); // Assuming success

      // Construct the expected standardized output for the hook
      const expectedOutput = {
        text: response.text,
        usage: response.usage,
        finishReason: response.finishReason,
        providerResponse: response,
        // warnings: response.warnings, // If response includes warnings
      };

      // Verify onEnd was called with the agent, standardized output, undefined error, and context
      expect(onEndSpy).toHaveBeenCalledWith({
        agent: agent,
        output: expectedOutput,
        error: undefined,
        context: expect.objectContaining({ operationId: expect.any(String) }),
      });
    });

    // Add a test for the error case (optional but recommended)
    it("should call onEnd with an error when agent fails", async () => {
      const onEndSpy = jest.fn();
      // Mock the LLM to throw an error
      const errorProvider = {
        generateText: jest.fn().mockRejectedValue(new Error("LLM Error")),
        getModelIdentifier: () => "mock-error-model",
      };
      const errorAgent = new Agent({
        name: "ErrorAgent",
        instructions: "Error agent",
        llm: errorProvider as any,
        model: "mock-error-model",
        hooks: createHooks({ onEnd: onEndSpy }),
      });

      try {
        await errorAgent.generateText("Test input");
      } catch (_e) {
        // Expected error
      }

      // Verify onEnd was called with undefined output and an error object
      expect(onEndSpy).toHaveBeenCalledWith({
        agent: errorAgent,
        output: undefined,
        error: expect.objectContaining({ message: "LLM Error" }), // Check for VoltAgentError structure
        context: expect.objectContaining({ operationId: expect.any(String) }),
      });
    });
  });

  describe("onHandoff", () => {
    it("should call onHandoff when agent is handed off to", async () => {
      const onHandoffSpy = jest.fn();
      agent.hooks = createHooks({ onHandoff: onHandoffSpy });

      // Simulate a handoff by calling the hook directly with the object
      await agent.hooks.onHandoff?.({ agent: agent, source: sourceAgent });

      // Verify onHandoff was called with the correct object
      expect(onHandoffSpy).toHaveBeenCalledWith({ agent: agent, source: sourceAgent });
    });
  });

  describe("onToolStart & onToolEnd", () => {
    it("should call onToolStart and onToolEnd when using tools", async () => {
      const onToolStartSpy = jest.fn();
      const onToolEndSpy = jest.fn();
      agent.hooks = createHooks({
        onToolStart: onToolStartSpy,
        onToolEnd: onToolEndSpy,
      });

      agent.addItems([tool]);
      const mockContext = createMockContext();
      const toolResult = "Tool result";

      // Directly execute the hooks with the object argument
      await agent.hooks.onToolStart?.({ agent: agent, tool: tool, context: mockContext });
      await agent.hooks.onToolEnd?.({
        agent: agent,
        tool: tool,
        output: toolResult,
        error: undefined,
        context: mockContext,
      });

      // Verify hooks were called with correct argument objects
      expect(onToolStartSpy).toHaveBeenCalledWith({
        agent: agent,
        tool: tool,
        context: mockContext,
      });
      expect(onToolEndSpy).toHaveBeenCalledWith({
        agent: agent,
        tool: tool,
        output: toolResult,
        error: undefined,
        context: mockContext,
      });
    });

    // Add a test for tool error case (optional)
    it("should call onToolEnd with an error when tool fails", async () => {
      const onToolEndSpy = jest.fn();
      agent.hooks = createHooks({ onToolEnd: onToolEndSpy });
      const mockContext = createMockContext();
      const toolError = new Error("Tool execution failed");
      const voltagentError = {
        // Simulate a VoltAgentError for tool failure
        message: toolError.message,
        originalError: toolError,
        stage: "tool_execution",
        toolError: { toolCallId: "mock-id", toolName: tool.name, toolExecutionError: toolError },
      } as VoltAgentError;

      // Simulate calling onToolEnd with an error
      await agent.hooks.onToolEnd?.({
        agent: agent,
        tool: tool,
        output: undefined,
        error: voltagentError,
        context: mockContext,
      });

      // Verify onToolEnd was called with undefined output and the error object
      expect(onToolEndSpy).toHaveBeenCalledWith({
        agent: agent,
        tool: tool,
        output: undefined,
        error: voltagentError,
        context: mockContext,
      });
    });
  });
});

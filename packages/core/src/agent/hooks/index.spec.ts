import { z } from "zod";
import { type AgentHooks, createHooks } from ".";
import { createTestLibSQLStorage } from "../../test-utils/libsql-test-helpers";
import { type AgentTool, createTool } from "../../tool";
import { Agent } from "../agent";
// Import only OperationContext and VoltAgentError
import type { OperationContext, VoltAgentError } from "../types";

// Removed unused mock types

// Mock LLM provider
class MockProvider {
  async generateText() {
    return {
      provider: { originalResponse: true },
      text: "Mock response",
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      },
      finishReason: "stop",
    };
  }

  getModelIdentifier() {
    return "mock-model";
  }
}

// Create a test agent
const createTestAgent = (name: string) => {
  const memory = createTestLibSQLStorage(`hooks_${name}`);
  return new Agent({
    name,
    description: `Test ${name}`,
    llm: new MockProvider() as any,
    model: "mock-model",
    memory: memory,
    historyMemory: memory,
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
      execute: vi.fn().mockResolvedValue("Tool result"),
    });

    // Set hooks on the agent
    agent.hooks = hooks;
  });

  describe("onStart", () => {
    it("should call onStart when agent starts generating", async () => {
      const onStartSpy = vi.fn();
      agent.hooks = createHooks({ onStart: onStartSpy });

      await agent.generateText("Test input");

      // Verify onStart was called with the correct object structure
      expect(onStartSpy).toHaveBeenCalledWith({
        agent: agent,
        context: expect.objectContaining({
          operationId: expect.any(String),
          isActive: expect.any(Boolean),
        }), // Check for context object
      });
    });
  });

  describe("onEnd", () => {
    it("should call onEnd when agent completes generating successfully", async () => {
      const onEndSpy = vi.fn();
      agent.hooks = createHooks({ onEnd: onEndSpy });

      const response = await agent.generateText("Test input"); // Assuming success

      // Verify onEnd was called with the correct structure using objectContaining
      expect(onEndSpy).toHaveBeenCalledWith({
        agent: agent,
        output: expect.objectContaining({
          text: response.text,
          usage: response.usage,
          finishReason: response.finishReason,
          provider: response.provider,
          userContext: expect.any(Map), // Verify userContext is included
        }),
        error: undefined,
        conversationId: expect.any(String),
        context: expect.objectContaining({
          operationId: expect.any(String),
          isActive: expect.any(Boolean),
        }),
      });
    });

    it("should include userContext in the onEnd hook output", async () => {
      const onEndSpy = vi.fn();
      agent.hooks = createHooks({ onEnd: onEndSpy });

      const userContext = new Map<string | symbol, unknown>();
      userContext.set("agentName", "Test Agent");
      userContext.set("sessionId", "test-session-123");

      const response = await agent.generateText("Test input", { userContext });

      // Verify onEnd was called with userContext properly passed through
      expect(onEndSpy).toHaveBeenCalledWith({
        agent: agent,
        output: expect.objectContaining({
          text: response.text,
          userContext: expect.any(Map),
        }),
        error: undefined,
        conversationId: expect.any(String),
        context: expect.objectContaining({
          operationId: expect.any(String),
          isActive: expect.any(Boolean),
        }),
      });

      // Verify the specific userContext values are present
      const callArgs = onEndSpy.mock.calls[0][0];
      expect(callArgs.output.userContext.get("agentName")).toBe("Test Agent");
      expect(callArgs.output.userContext.get("sessionId")).toBe("test-session-123");
    });

    // Add a test for the error case (optional but recommended)
    it("should call onEnd with an error when agent fails", async () => {
      const onEndSpy = vi.fn();
      // Mock the LLM to throw an error
      const errorProvider = {
        generateText: vi.fn().mockRejectedValue(new Error("LLM Error")),
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
        conversationId: expect.any(String),
        error: expect.objectContaining({ message: "LLM Error" }), // Check for VoltAgentError structure
        context: expect.objectContaining({
          operationId: expect.any(String),
          isActive: expect.any(Boolean),
        }),
      });
    });
  });

  describe("onHandoff", () => {
    it("should call onHandoff when agent is handed off to", async () => {
      const onHandoffSpy = vi.fn();
      agent.hooks = createHooks({ onHandoff: onHandoffSpy });

      // Simulate a handoff by calling the hook directly with the object
      await agent.hooks.onHandoff?.({ agent: agent, source: sourceAgent });

      // Verify onHandoff was called with the correct object
      expect(onHandoffSpy).toHaveBeenCalledWith({ agent: agent, source: sourceAgent });
    });
  });

  describe("onToolStart & onToolEnd", () => {
    it("should call onToolStart and onToolEnd when using tools", async () => {
      const onToolStartSpy = vi.fn();
      const onToolEndSpy = vi.fn();
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
      const onToolEndSpy = vi.fn();
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

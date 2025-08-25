import { type AgentHooks, createHooks } from ".";
import type { Tool } from "../../tool";
import type { AgentContext } from "../agent";
import { createMockLanguageModel, createMockTool, createTestAgent } from "../test-utils";

describe("Agent Hooks Functionality", () => {
  let hooks: AgentHooks;
  let agent: ReturnType<typeof createTestAgent>;
  let tool: Tool<any, any>;

  beforeEach(() => {
    hooks = createHooks();
    agent = createTestAgent({
      name: "TestAgent",
      model: createMockLanguageModel({
        modelId: "mock-model",
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
          content: [{ type: "text", text: "Mock response" }],
          warnings: [],
        },
      }),
      hooks: hooks,
    });
    tool = createMockTool("test-tool", async () => "Tool result", {
      description: "A test tool",
    });
  });

  describe("onStart", () => {
    it("should call onStart when agent starts generating", async () => {
      const onStartSpy = vi.fn();
      agent = createTestAgent({
        name: "TestAgent",
        model: createMockLanguageModel({
          modelId: "mock-model",
          doGenerate: {
            finishReason: "stop",
            usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
            content: [{ type: "text", text: "Mock response" }],
            warnings: [],
          },
        }),
        hooks: createHooks({ onStart: onStartSpy }),
      });

      await agent.generateText("Test input");

      // Verify onStart was called with AgentContext
      expect(onStartSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: expect.objectContaining({
            id: expect.any(String),
          }),
        }),
      );
    });
  });

  describe("onEnd", () => {
    it("should call onEnd when agent completes generating successfully", async () => {
      const onEndSpy = vi.fn();
      agent = createTestAgent({
        name: "TestAgent",
        model: createMockLanguageModel({
          modelId: "mock-model",
          doGenerate: {
            finishReason: "stop",
            usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
            content: [{ type: "text", text: "Mock response" }],
            warnings: [],
          },
        }),
        hooks: createHooks({ onEnd: onEndSpy }),
      });

      await agent.generateText("Test input");

      // Verify onEnd was called
      expect(onEndSpy).toHaveBeenCalled();

      // Get the actual arguments
      const [contextArg, resultArg, errorArg] = onEndSpy.mock.calls[0];

      // Verify context structure
      expect(contextArg).toHaveProperty("operation");
      expect(contextArg.operation).toHaveProperty("id");

      // Verify result contains expected data
      expect(resultArg).toBeDefined();
      expect(resultArg.text).toBe("Mock response");
      expect(resultArg.finishReason).toBe("stop");
      expect(resultArg.usage).toEqual({
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
      });

      // Verify no error
      expect(errorArg).toBeUndefined();
    });

    it("should include context in the onEnd hook output", async () => {
      const onEndSpy = vi.fn();
      agent = createTestAgent({
        name: "TestAgent",
        model: createMockLanguageModel({
          modelId: "mock-model",
          doGenerate: {
            finishReason: "stop",
            usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
            content: [{ type: "text", text: "Mock response" }],
            warnings: [],
          },
        }),
        hooks: createHooks({ onEnd: onEndSpy }),
      });

      const context = new Map<string | symbol, unknown>();
      context.set("agentName", "Test Agent");
      context.set("sessionId", "test-session-123");

      await agent.generateText("Test input", { context });

      // Verify onEnd was called
      expect(onEndSpy).toHaveBeenCalled();

      // Get the context from the call
      const callArgs = onEndSpy.mock.calls[0];
      const contextArg = callArgs[0] as AgentContext;
      const resultArg = callArgs[1];

      // Verify context values are present
      expect(contextArg.context?.get("agentName")).toBe("Test Agent");
      expect(contextArg.context?.get("sessionId")).toBe("test-session-123");
      if (resultArg?.context) {
        expect(resultArg.context.get("agentName")).toBe("Test Agent");
        expect(resultArg.context.get("sessionId")).toBe("test-session-123");
      }
    });

    it("should call onEnd with an error when agent fails", async () => {
      const onEndSpy = vi.fn();
      const onErrorSpy = vi.fn();

      // Create an agent with a model that throws an error
      const errorAgent = createTestAgent({
        name: "ErrorAgent",
        model: createMockLanguageModel({
          modelId: "mock-error-model",
          doGenerate: async () => {
            throw new Error("LLM Error");
          },
        }),
        hooks: createHooks({ onEnd: onEndSpy, onError: onErrorSpy }),
      });

      try {
        await errorAgent.generateText("Test input");
      } catch (_e) {
        // Expected error
      }

      // Verify onError was called with context and error
      expect(onErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: expect.objectContaining({
            id: expect.any(String),
          }),
        }),
        expect.objectContaining({
          message: expect.stringContaining("LLM Error"),
        }),
      );

      // Verify onEnd was called with undefined result and an error
      expect(onEndSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: expect.objectContaining({
            id: expect.any(String),
          }),
        }),
        undefined, // No result on error
        expect.objectContaining({
          message: expect.stringContaining("LLM Error"),
        }),
      );
    });
  });

  describe("onHandoff", () => {
    it("should call onHandoff when agent is handed off to", async () => {
      const onHandoffSpy = vi.fn();
      agent = createTestAgent({
        name: "TestAgent",
        model: createMockLanguageModel(),
        hooks: createHooks({ onHandoff: onHandoffSpy }),
      });

      // Create a mock context for testing
      const mockContext = {
        operation: {
          id: "test-op-id",
          operationId: "test-op-id",
          userId: "test-user",
          conversationId: "test-conv",
        },
        system: {
          logger: console as any,
          signal: new AbortController().signal,
        },
        context: new Map(),
        telemetry: {},
      } as unknown as AgentContext;

      // Simulate a handoff by calling the hook directly
      await agent.hooks.onHandoff?.(mockContext);

      // Verify onHandoff was called with the context
      expect(onHandoffSpy).toHaveBeenCalledWith(mockContext);
    });
  });

  describe("onToolStart & onToolEnd", () => {
    it("should call onToolStart and onToolEnd when using tools", async () => {
      const onToolStartSpy = vi.fn();
      const onToolEndSpy = vi.fn();
      agent = createTestAgent({
        name: "TestAgent",
        model: createMockLanguageModel(),
        hooks: createHooks({
          onToolStart: onToolStartSpy,
          onToolEnd: onToolEndSpy,
        }),
      });

      // Add tools to the agent
      agent.addTools([tool]);

      // Create a mock context
      const mockContext = {
        operation: {
          id: "test-op-id",
          operationId: "test-op-id",
          userId: "test-user",
          conversationId: "test-conv",
        },
        system: {
          logger: console as any,
          signal: new AbortController().signal,
        },
        context: new Map(),
        telemetry: {},
      } as unknown as AgentContext;

      const toolResult = "Tool result";

      // Directly execute the hooks
      await agent.hooks.onToolStart?.(mockContext, tool);
      await agent.hooks.onToolEnd?.(mockContext, tool, toolResult, undefined);

      // Verify hooks were called with correct arguments
      expect(onToolStartSpy).toHaveBeenCalledWith(mockContext, tool);
      expect(onToolEndSpy).toHaveBeenCalledWith(mockContext, tool, toolResult, undefined);
    });

    it("should call onToolEnd with an error when tool fails", async () => {
      const onToolEndSpy = vi.fn();
      agent = createTestAgent({
        name: "TestAgent",
        model: createMockLanguageModel(),
        hooks: createHooks({ onToolEnd: onToolEndSpy }),
      });

      const mockContext = {
        operation: {
          id: "test-op-id",
          operationId: "test-op-id",
          userId: "test-user",
          conversationId: "test-conv",
        },
        system: {
          logger: console as any,
          signal: new AbortController().signal,
        },
        context: new Map(),
        telemetry: {},
      } as unknown as AgentContext;

      const toolError = new Error("Tool execution failed");

      // Simulate calling onToolEnd with an error
      await agent.hooks.onToolEnd?.(mockContext, tool, undefined, toolError);

      // Verify onToolEnd was called with undefined output and the error
      expect(onToolEndSpy).toHaveBeenCalledWith(mockContext, tool, undefined, toolError);
    });
  });

  describe("onPrepareMessages", () => {
    it("should call onPrepareMessages to transform messages", async () => {
      const onPrepareMessagesSpy = vi.fn((messages, _context) => ({
        messages: [
          ...messages,
          {
            id: "extra-msg",
            role: "system" as const,
            parts: [{ type: "text" as const, text: "Extra message" }],
          },
        ],
      }));

      agent = createTestAgent({
        name: "TestAgent",
        model: createMockLanguageModel(),
        hooks: createHooks({ onPrepareMessages: onPrepareMessagesSpy }),
      });

      const mockContext = {
        operation: {
          id: "test-op-id",
          operationId: "test-op-id",
          userId: "test-user",
          conversationId: "test-conv",
        },
        system: {
          logger: console as any,
          signal: new AbortController().signal,
        },
        context: new Map(),
        telemetry: {},
      } as unknown as AgentContext;

      const messages = [
        {
          id: "msg-1",
          role: "user" as const,
          parts: [{ type: "text" as const, text: "Hello" }],
        },
      ] as any[];

      const result = await agent.hooks.onPrepareMessages?.(messages, mockContext);

      expect(onPrepareMessagesSpy).toHaveBeenCalledWith(messages, mockContext);
      expect(result?.messages).toHaveLength(2);
      expect((result?.messages?.[1].parts[0] as any).text).toBe("Extra message");
    });
  });

  describe("onStepFinish", () => {
    it("should call onStepFinish when a step completes", async () => {
      const onStepFinishSpy = vi.fn();
      agent = createTestAgent({
        name: "TestAgent",
        model: createMockLanguageModel(),
        hooks: createHooks({ onStepFinish: onStepFinishSpy }),
      });

      const mockStep = {
        id: "step-1",
        type: "text",
        content: "Step content",
        finishReason: "stop",
      };

      await agent.hooks.onStepFinish?.(mockStep);

      expect(onStepFinishSpy).toHaveBeenCalledWith(mockStep);
    });
  });
});

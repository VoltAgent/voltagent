import { type AgentHooks, createHooks } from ".";
import type { Tool } from "../../tool";
import { createVoltAgentError } from "../errors";
import { createMockLanguageModel, createMockTool, createTestAgent } from "../test-utils";
import type { OperationContext } from "../types";

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

      // Verify onStart was called with args object
      expect(onStartSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          agent: expect.any(Object),
          context: expect.objectContaining({ operationId: expect.any(String) }),
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

      // Get the actual argument object
      const arg = onEndSpy.mock.calls[0][0];

      // Verify structure
      expect(arg).toHaveProperty("conversationId");
      expect(arg).toHaveProperty("agent");
      expect(arg).toHaveProperty("output");
      expect(arg).toHaveProperty("context");
      expect(arg.error).toBeUndefined();

      // Verify output contains expected data
      expect(arg.output.text).toBe("Mock response");
      expect(arg.output.finishReason).toBe("stop");
      expect(arg.output.usage).toEqual(
        expect.objectContaining({
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
        }),
      );
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

      // Get the argument from the call
      const arg = onEndSpy.mock.calls[0][0];

      // Verify context values are present
      expect(arg.context.context?.get("agentName")).toBe("Test Agent");
      expect(arg.context.context?.get("sessionId")).toBe("test-session-123");
      if (arg.output?.context) {
        expect(arg.output.context.get("agentName")).toBe("Test Agent");
        expect(arg.output.context.get("sessionId")).toBe("test-session-123");
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

      // Verify onError was called with args object
      expect(onErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          agent: expect.any(Object),
          context: expect.objectContaining({ operationId: expect.any(String) }),
          error: expect.objectContaining({ message: expect.stringContaining("LLM Error") }),
        }),
      );

      // Verify onEnd was called with error
      expect(onEndSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({ operationId: expect.any(String) }),
          output: undefined,
          error: expect.objectContaining({ message: expect.stringContaining("LLM Error") }),
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
      const _mockContext: OperationContext = {
        operationId: "test-op-id",
        userId: "test-user",
        conversationId: "test-conv",
        context: new Map(),
        // no userContext; use context only
        systemContext: new Map(),
        isActive: true,
        logger: console as any,
        abortController: new AbortController(),
        traceContext: {
          getRootSpan: () => ({}) as any,
          withSpan: async (_s: any, fn: any) => await fn(),
          createChildSpan: () => ({}) as any,
          end: () => {},
          setOutput: () => {},
          setInstructions: () => {},
          endChildSpan: () => {},
        } as any,
      };

      // Simulate a handoff by calling the hook directly
      await agent.hooks.onHandoff?.({ agent: agent as any, sourceAgent: agent as any });

      // Verify onHandoff was called with the args object
      expect(onHandoffSpy).toHaveBeenCalledWith(
        expect.objectContaining({ agent: expect.any(Object), sourceAgent: expect.any(Object) }),
      );
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
      const mockContext: OperationContext = {
        operationId: "test-op-id",
        userId: "test-user",
        conversationId: "test-conv",
        context: new Map(),
        systemContext: new Map(),
        isActive: true,
        logger: console as any,
        abortController: new AbortController(),
        traceContext: {
          getRootSpan: () => ({}) as any,
          withSpan: async (_s: any, fn: any) => await fn(),
          createChildSpan: () => ({}) as any,
          end: () => {},
          setOutput: () => {},
          setInstructions: () => {},
          endChildSpan: () => {},
        } as any,
        startTime: new Date(),
      } as any;

      const toolResult = "Tool result";

      // Directly execute the hooks
      await agent.hooks.onToolStart?.({ agent: agent as any, tool, context: mockContext });
      await agent.hooks.onToolEnd?.({
        agent: agent as any,
        tool,
        output: toolResult,
        error: undefined,
        context: mockContext,
      });

      // Verify hooks were called with correct arguments
      expect(onToolStartSpy).toHaveBeenCalledWith(
        expect.objectContaining({ agent: expect.any(Object), tool, context: mockContext }),
      );
      expect(onToolEndSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          agent: expect.any(Object),
          tool,
          output: toolResult,
          error: undefined,
          context: mockContext,
        }),
      );
    });

    it("should call onToolEnd with an error when tool fails", async () => {
      const onToolEndSpy = vi.fn();
      agent = createTestAgent({
        name: "TestAgent",
        model: createMockLanguageModel(),
        hooks: createHooks({ onToolEnd: onToolEndSpy }),
      });

      const mockContext: OperationContext = {
        operationId: "test-op-id",
        userId: "test-user",
        conversationId: "test-conv",
        context: new Map(),
        systemContext: new Map(),
        isActive: true,
        logger: console as any,
        abortController: new AbortController(),
        traceContext: {
          getRootSpan: () => ({}) as any,
          withSpan: async (_s: any, fn: any) => await fn(),
          createChildSpan: () => ({}) as any,
          end: () => {},
          setOutput: () => {},
          setInstructions: () => {},
          endChildSpan: () => {},
        } as any,
        startTime: new Date(),
      } as any;

      const toolError = new Error("Tool execution failed");

      // Simulate calling onToolEnd with an error
      await agent.hooks.onToolEnd?.({
        agent: agent as any,
        tool,
        output: undefined,
        error: toolError,
        context: mockContext,
      });

      // Verify onToolEnd was called with undefined output and the error
      expect(onToolEndSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          agent: expect.any(Object),
          tool,
          output: undefined,
          error: toolError,
          context: mockContext,
        }),
      );
    });

    it("should call onToolError when tool fails", async () => {
      const onToolErrorSpy = vi.fn().mockResolvedValue({
        output: {
          error: true,
          message: "normalized",
        },
      });
      agent = createTestAgent({
        name: "TestAgent",
        model: createMockLanguageModel(),
        hooks: createHooks({ onToolError: onToolErrorSpy }),
      });

      const mockContext: OperationContext = {
        operationId: "test-op-id",
        userId: "test-user",
        conversationId: "test-conv",
        context: new Map(),
        systemContext: new Map(),
        isActive: true,
        logger: console as any,
        abortController: new AbortController(),
        traceContext: {
          getRootSpan: () => ({}) as any,
          withSpan: async (_s: any, fn: any) => await fn(),
          createChildSpan: () => ({}) as any,
          end: () => {},
          setOutput: () => {},
          setInstructions: () => {},
          endChildSpan: () => {},
        } as any,
        startTime: new Date(),
      } as any;

      const originalError = new Error("Tool execution failed");
      const toolError = createVoltAgentError(originalError, {
        stage: "tool_execution",
      });

      await agent.hooks.onToolError?.({
        agent: agent as any,
        tool,
        args: { query: "test" },
        error: toolError,
        originalError,
        context: mockContext,
      });

      expect(onToolErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          agent: expect.any(Object),
          tool,
          args: { query: "test" },
          error: toolError,
          originalError,
          context: mockContext,
        }),
      );
    });
  });

  describe("onPrepareMessages", () => {
    it("should call onPrepareMessages to transform messages", async () => {
      const onPrepareMessagesSpy = vi.fn(({ messages }: any) => ({
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

      const mockContext: OperationContext = {
        operationId: "test-op-id",
        userId: "test-user",
        conversationId: "test-conv",
        context: new Map(),
        systemContext: new Map(),
        isActive: true,
        logger: console as any,
        abortController: new AbortController(),
        traceContext: {
          getRootSpan: () => ({}) as any,
          withSpan: async (_s: any, fn: any) => await fn(),
          createChildSpan: () => ({}) as any,
          end: () => {},
          setOutput: () => {},
          setInstructions: () => {},
          endChildSpan: () => {},
        } as any,
        startTime: new Date(),
      };

      const messages = [
        {
          id: "msg-1",
          role: "user" as const,
          parts: [{ type: "text" as const, text: "Hello" }],
        },
      ] as any[];

      const result = await agent.hooks.onPrepareMessages?.({
        messages,
        agent: agent as any,
        context: mockContext,
      });

      expect(onPrepareMessagesSpy).toHaveBeenCalledWith(
        expect.objectContaining({ messages, context: mockContext }),
      );
      expect(result?.messages).toHaveLength(2);
      expect((result?.messages?.[1].parts[0] as any).text).toBe("Extra message");
    });
  });

  describe("onPrepareModelMessages", () => {
    it("should call onPrepareModelMessages to transform model messages", async () => {
      const onPrepareModelMessagesSpy = vi.fn(({ modelMessages }: any) => ({
        modelMessages: [
          ...modelMessages,
          {
            role: "system",
            content: [{ type: "text", text: "Injected" }],
          },
        ],
      }));

      agent = createTestAgent({
        name: "TestAgent",
        model: createMockLanguageModel(),
        hooks: createHooks({ onPrepareModelMessages: onPrepareModelMessagesSpy }),
      });

      const mockContext: OperationContext = {
        operationId: "test-op-id",
        context: new Map(),
        systemContext: new Map(),
        isActive: true,
        logger: console as any,
        abortController: new AbortController(),
      } as any;

      const modelMessages = [
        {
          role: "user",
          content: [{ type: "text", text: "Hello" }],
        },
      ] as any[];

      const result = await agent.hooks.onPrepareModelMessages?.({
        modelMessages,
        uiMessages: [],
        agent: agent as any,
        context: mockContext,
      });

      expect(onPrepareModelMessagesSpy).toHaveBeenCalledWith(
        expect.objectContaining({ modelMessages, uiMessages: [], context: mockContext }),
      );
      expect(result?.modelMessages).toHaveLength(2);
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

      await agent.hooks.onStepFinish?.({
        agent: agent as any,
        step: mockStep,
        context: {
          operationId: "op",
        } as any,
      });

      expect(onStepFinishSpy).toHaveBeenCalledWith(
        expect.objectContaining({ agent: expect.any(Object), step: mockStep }),
      );
    });
  });
});

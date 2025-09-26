import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Agent } from "../agent/agent";
import { LoggerProxy, getGlobalLogger } from "../logger";
import { AgentRegistry } from "../registries/agent-registry";
import { VoltOpsClient } from "./client";
import type { PromptContent, PromptHelper, VoltOpsClientOptions } from "./types";

// Mock the VoltOps prompt manager
const mockPromptManager = {
  getPrompt: vi.fn(),
  preload: vi.fn(),
  clearCache: vi.fn(),
  getCacheStats: vi.fn(),
};

// Mock the prompt manager module
vi.mock("./prompt-manager", () => ({
  VoltOpsPromptManagerImpl: vi.fn(() => mockPromptManager),
}));

// Mock observability exporter
vi.mock("../telemetry/exporter", () => ({
  VoltAgentExporter: vi.fn(() => ({
    exportHistoryEntry: vi.fn(),
    exportHistoryEntryAsync: vi.fn(),
    exportTimelineEvent: vi.fn(),
    exportTimelineEventAsync: vi.fn(),
  })),
}));

// Create a factory function for logger instances
const createMockLogger = () => {
  const logger = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  };
  // Set up child to return itself
  logger.child.mockReturnValue(logger);
  return logger;
};

// Create initial mock logger instance
let mockLoggerInstance = createMockLogger();

vi.mock("../logger", () => ({
  getGlobalLogger: vi.fn(() => mockLoggerInstance),
  LoggerProxy: vi.fn().mockImplementation(() => mockLoggerInstance),
  LogEvents: {
    AGENT_CREATED: "agent.created",
    AGENT_RUN_START: "agent.run.start",
    AGENT_RUN_COMPLETE: "agent.run.complete",
    AGENT_RUN_ERROR: "agent.run.error",
    VOLTOPS_CLIENT_INITIALIZED: "voltops.client.initialized",
  },
}));

// Mock agent provider
const mockProvider = {
  generateText: vi.fn(),
  streamText: vi.fn(),
  generateObject: vi.fn(),
  streamObject: vi.fn(),
  getModelIdentifier: vi.fn(() => "test-model"),
  toMessage: vi.fn(),
};

/**
 * Create a mock VoltOpsClient for testing
 */
const createMockVoltOpsClient = (options: Partial<VoltOpsClientOptions> = {}): VoltOpsClient => {
  const defaultOptions: VoltOpsClientOptions = {
    baseUrl: "https://test.voltops.dev",
    publicKey: "pk_test_public_key",
    secretKey: "sk_test_secret_key",
    prompts: true,
    observability: false, // Disable observability for testing
    ...options,
  };

  return new VoltOpsClient(defaultOptions);
};

// Removed unused createTestAgent function

describe("VoltOpsClient Priority Hierarchy", () => {
  beforeEach(() => {
    // Create fresh logger instance for each test
    mockLoggerInstance = createMockLogger();

    // Update the mock to return the fresh instance
    vi.mocked(getGlobalLogger).mockReturnValue(mockLoggerInstance);
    vi.mocked(LoggerProxy).mockImplementation(() => mockLoggerInstance);

    // Clear other mocks
    vi.clearAllMocks();

    // Reset registry state
    AgentRegistry.getInstance().setGlobalVoltOpsClient(undefined as any);

    // Reset prompt manager mock
    mockPromptManager.getPrompt.mockClear();
  });

  afterEach(() => {
    // Only restore non-module mocks to preserve logger setup
    vi.restoreAllMocks({ stubGlobals: false } as any);
  });

  describe("createPromptHelperWithFallback priority system", () => {
    it("should prioritize agent-specific VoltOpsClient over global", async () => {
      // Setup: Create mock clients with working prompt managers
      const agentPromptContent: PromptContent = {
        type: "text",
        text: "Agent-specific prompt content",
      };
      const globalPromptContent: PromptContent = {
        type: "text",
        text: "Global prompt content",
      };

      // Create agent-specific client
      const agentVoltOpsClient = createMockVoltOpsClient();
      const globalVoltOpsClient = createMockVoltOpsClient();

      // Mock the createPromptHelper method to return our test content
      const mockAgentGetPrompt = vi.fn().mockResolvedValue(agentPromptContent);
      const mockGlobalGetPrompt = vi.fn().mockResolvedValue(globalPromptContent);

      vi.spyOn(agentVoltOpsClient, "createPromptHelper").mockReturnValue({
        getPrompt: mockAgentGetPrompt,
      });

      vi.spyOn(globalVoltOpsClient, "createPromptHelper").mockReturnValue({
        getPrompt: mockGlobalGetPrompt,
      });

      // Set global client
      AgentRegistry.getInstance().setGlobalVoltOpsClient(globalVoltOpsClient);

      // Create prompt helper with agent-specific client (highest priority)
      const promptHelper = VoltOpsClient.createPromptHelperWithFallback(
        "test-agent",
        "TestAgent",
        "fallback instructions",
        agentVoltOpsClient,
      );

      // Execute prompt fetch
      const result = await promptHelper.getPrompt({ promptName: "test-prompt" });

      // Verify agent-specific client was used (not global)
      expect(result).toEqual(agentPromptContent);
      expect(mockAgentGetPrompt).toHaveBeenCalledTimes(1);
      expect(mockGlobalGetPrompt).not.toHaveBeenCalled();
    });

    it("should fall back to global VoltOpsClient when agent-specific is not available", async () => {
      // Setup: Only global VoltOps client
      const globalVoltOpsClient = createMockVoltOpsClient();
      const globalPromptContent: PromptContent = {
        type: "text",
        text: "Global prompt content",
      };

      const mockGlobalGetPrompt = vi.fn().mockResolvedValue(globalPromptContent);
      vi.spyOn(globalVoltOpsClient, "createPromptHelper").mockReturnValue({
        getPrompt: mockGlobalGetPrompt,
      });

      AgentRegistry.getInstance().setGlobalVoltOpsClient(globalVoltOpsClient);

      // Create prompt helper without agent-specific client
      const promptHelper = VoltOpsClient.createPromptHelperWithFallback(
        "test-agent",
        "TestAgent",
        "fallback instructions",
        undefined, // No agent-specific client
      );

      const result = await promptHelper.getPrompt({ promptName: "test-prompt" });

      // Verify global client was used
      expect(result).toEqual(globalPromptContent);
      expect(mockGlobalGetPrompt).toHaveBeenCalledTimes(1);
    });

    it("should fall back to instructions when agent-specific prompts are disabled", async () => {
      // Setup: Agent client with prompts disabled
      const agentVoltOpsClient = createMockVoltOpsClient({ prompts: false });
      const globalVoltOpsClient = createMockVoltOpsClient();

      const mockGlobalGetPrompt = vi.fn().mockResolvedValue({
        type: "text",
        text: "Global prompt content",
      });

      vi.spyOn(globalVoltOpsClient, "createPromptHelper").mockReturnValue({
        getPrompt: mockGlobalGetPrompt,
      });

      AgentRegistry.getInstance().setGlobalVoltOpsClient(globalVoltOpsClient);

      // Create prompt helper with agent client that has prompts disabled
      const promptHelper = VoltOpsClient.createPromptHelperWithFallback(
        "test-agent",
        "TestAgent",
        "fallback instructions",
        agentVoltOpsClient,
      );

      const result = await promptHelper.getPrompt({ promptName: "test-prompt" });

      // Should fall back to global client since agent prompts are disabled
      expect(result.type).toBe("text");
      expect(mockGlobalGetPrompt).toHaveBeenCalledTimes(1);
    });

    it("should use fallback instructions when no VoltOpsClient is available", async () => {
      // Setup: No VoltOps clients at all
      // Clear previous calls
      mockLoggerInstance.info.mockClear();
      mockLoggerInstance.warn.mockClear();

      const promptHelper = VoltOpsClient.createPromptHelperWithFallback(
        "test-agent",
        "TestAgent",
        "fallback instructions",
        undefined,
      );

      const result = await promptHelper.getPrompt({ promptName: "test-prompt" });

      // Should return fallback instructions
      expect(result).toEqual({
        type: "text",
        text: "fallback instructions",
      });

      // Should show helpful logger messages
      expect(mockLoggerInstance.info).toHaveBeenCalledWith(
        expect.stringContaining("VoltOps Prompts"),
      );
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        expect.stringContaining("Using fallback instructions for agent 'TestAgent'"),
      );
    });
  });

  describe("Agent integration with VoltOpsClient priority", () => {
    it("should use agent-specific VoltOpsClient in resolveInstructions", async () => {
      // Setup: Create mock clients with spy functions
      const agentVoltOpsClient = createMockVoltOpsClient();
      const globalVoltOpsClient = createMockVoltOpsClient();

      const agentPromptContent: PromptContent = {
        type: "text",
        text: "Agent-specific dynamic instructions",
      };

      // Mock the createPromptHelperWithFallback static method to control which client is used
      const mockAgentGetPrompt = vi.fn().mockResolvedValue(agentPromptContent);
      const mockGlobalGetPrompt = vi.fn().mockResolvedValue({
        type: "text",
        text: "Global dynamic instructions",
      });

      // Spy on the static method that determines priority
      const createPromptHelperSpy = vi
        .spyOn(VoltOpsClient, "createPromptHelperWithFallback")
        .mockReturnValue({
          getPrompt: mockAgentGetPrompt,
        });

      // Set global client but agent has its own
      AgentRegistry.getInstance().setGlobalVoltOpsClient(globalVoltOpsClient);

      // Create dynamic instructions function that uses prompts
      const dynamicInstructions = async ({ prompts }: { prompts: PromptHelper }) => {
        return await prompts.getPrompt({ promptName: "agent-prompt" });
      };

      // Create agent with dynamic instructions and agent-specific client
      const dynamicAgent = new Agent({
        name: "DynamicAgent",
        instructions: dynamicInstructions,
        llm: mockProvider,
        model: "test-model",
        voltOpsClient: agentVoltOpsClient,
      });

      // Test resolveInstructions (private method, tested through getSystemMessage)
      // Create proper OperationContext structure
      const mockRootSpan = { setAttribute: vi.fn() };

      const oc = {
        operationId: "test-op",
        userId: "test-user",
        conversationId: "test-conv",
        context: new Map(),
        systemContext: new Map(),
        isActive: true,
        logger: mockLoggerInstance as any,
        traceContext: {
          getRootSpan: () => mockRootSpan,
          withSpan: async (_span: any, fn: any) => await fn(),
          createChildSpan: () => ({}) as any,
          end: () => {},
          setOutput: () => {},
          setInstructions: () => {},
          endChildSpan: () => {},
        },
        startTime: new Date(),
      };

      const systemMessageResponse = await (dynamicAgent as any).getSystemMessage("test input", oc);

      // Verify createPromptHelperWithFallback was called with agent-specific client
      expect(createPromptHelperSpy).toHaveBeenCalledWith(
        "DynamicAgent",
        "DynamicAgent",
        expect.any(String),
        agentVoltOpsClient,
      );

      // Verify agent-specific prompt was fetched
      expect(mockAgentGetPrompt).toHaveBeenCalledTimes(1);
      expect(mockAgentGetPrompt).toHaveBeenCalledWith({ promptName: "agent-prompt" });

      // Verify global client was not used
      expect(mockGlobalGetPrompt).not.toHaveBeenCalled();
      // Verify that getSystemMessage returned a response
      expect(systemMessageResponse).toBeDefined();

      // Cleanup
      createPromptHelperSpy.mockRestore();
    });

    it("should use global VoltOpsClient when agent has no specific client", async () => {
      // Setup: Only global VoltOps client
      const globalVoltOpsClient = createMockVoltOpsClient();

      const mockGlobalGetPrompt = vi.fn().mockResolvedValue({
        type: "text",
        text: "Global dynamic instructions",
      });

      // Mock the static method to return global client behavior
      const createPromptHelperSpy = vi
        .spyOn(VoltOpsClient, "createPromptHelperWithFallback")
        .mockReturnValue({
          getPrompt: mockGlobalGetPrompt,
        });

      AgentRegistry.getInstance().setGlobalVoltOpsClient(globalVoltOpsClient);

      // Create dynamic instructions function
      const dynamicInstructions = async ({ prompts }: { prompts: PromptHelper }) => {
        return await prompts.getPrompt({ promptName: "global-prompt" });
      };

      // Create agent WITHOUT specific VoltOps client
      const dynamicAgent = new Agent({
        name: "DynamicAgent",
        instructions: dynamicInstructions,
        llm: mockProvider,
        model: "test-model",
        // No voltOpsClient specified - should use global
      });

      // Create proper OperationContext structure
      const mockRootSpan = { setAttribute: vi.fn() };

      const oc = {
        operationId: "test-op",
        userId: "test-user",
        conversationId: "test-conv",
        context: new Map(),
        systemContext: new Map(),
        isActive: true,
        logger: mockLoggerInstance as any,
        traceContext: {
          getRootSpan: () => mockRootSpan,
          withSpan: async (_span: any, fn: any) => await fn(),
          createChildSpan: () => ({}) as any,
          end: () => {},
          setOutput: () => {},
          setInstructions: () => {},
          endChildSpan: () => {},
        } as any,
        startTime: new Date(),
      } as any;

      const systemMessageResponse = await (dynamicAgent as any).getSystemMessage("test input", oc);

      // Verify createPromptHelperWithFallback was called without agent client
      expect(createPromptHelperSpy).toHaveBeenCalledWith(
        "DynamicAgent",
        "DynamicAgent",
        expect.any(String),
        undefined, // No agent-specific client
      );

      // Verify global client was used
      expect(mockGlobalGetPrompt).toHaveBeenCalledTimes(1);
      // Verify that getSystemMessage returned a response
      expect(systemMessageResponse).toBeDefined();

      // Cleanup
      createPromptHelperSpy.mockRestore();
    });
  });

  describe("Error handling and edge cases", () => {
    it("should handle agent VoltOpsClient with prompts=undefined gracefully", () => {
      // Setup: Agent client with undefined prompts (malformed)
      const malformedClient = {
        prompts: undefined,
        options: { prompts: true },
      } as any;

      const globalVoltOpsClient = createMockVoltOpsClient();
      if (globalVoltOpsClient.prompts) {
        globalVoltOpsClient.prompts.getPrompt = vi.fn().mockResolvedValue({
          type: "text",
          text: "Global fallback",
        });
      }

      AgentRegistry.getInstance().setGlobalVoltOpsClient(globalVoltOpsClient);

      const promptHelper = VoltOpsClient.createPromptHelperWithFallback(
        "test-agent",
        "TestAgent",
        "fallback instructions",
        malformedClient,
      );

      // Should fall back to global client without errors
      expect(promptHelper).toBeDefined();
      expect(typeof promptHelper.getPrompt).toBe("function");
    });

    it("should handle both agent and global clients with prompts disabled", async () => {
      // Setup: Both clients have prompts disabled
      const agentClient = createMockVoltOpsClient({ prompts: false });
      const globalClient = createMockVoltOpsClient({ prompts: false });

      AgentRegistry.getInstance().setGlobalVoltOpsClient(globalClient);

      // Clear previous calls
      mockLoggerInstance.info.mockClear();
      mockLoggerInstance.warn.mockClear();

      const promptHelper = VoltOpsClient.createPromptHelperWithFallback(
        "test-agent",
        "TestAgent",
        "ultimate fallback",
        agentClient,
      );

      const result = await promptHelper.getPrompt({ promptName: "test-prompt" });

      // Should use fallback instructions
      expect(result).toEqual({
        type: "text",
        text: "ultimate fallback",
      });

      expect(mockLoggerInstance.info).toHaveBeenCalledWith(
        expect.stringContaining("Found but prompts disabled"),
      );
    });
  });
});

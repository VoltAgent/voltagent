import { SubAgentManager } from "./index";
import type { Agent } from "../index";
import type { AgentHandoffOptions, OperationContext } from "../types";

// Creating a Mock Agent class
class MockAgent {
  id: string;
  name: string;
  description: string;

  constructor(id: string, name: string, description = "Mock agent description") {
    this.id = id;
    this.name = name;
    this.description = description;
  }

  getStatus() {
    return "idle";
  }

  getModelName() {
    return "mock-model";
  }

  getFullState() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      status: this.getStatus(),
      model: this.getModelName(),
      subAgents: [],
    };
  }

  getToolsForApi() {
    return [];
  }

  async generateText(_messages: any[], _options: any) {
    return {
      text: `Response from ${this.name}`,
    };
  }
}

describe("SubAgentManager", () => {
  let subAgentManager: SubAgentManager;
  let mockAgent1: any;
  let mockAgent2: any;

  beforeEach(() => {
    mockAgent1 = new MockAgent("agent1", "Math Agent");
    mockAgent2 = new MockAgent("agent2", "Writing Agent");
    subAgentManager = new SubAgentManager("Main Agent");
  });

  describe("constructor", () => {
    it("should initialize with empty sub-agents when none provided", () => {
      expect(subAgentManager.getSubAgents()).toEqual([]);
    });

    it("should initialize with provided sub-agents", () => {
      const manager = new SubAgentManager("Main Agent", [mockAgent1, mockAgent2]);
      expect(manager.getSubAgents().length).toBe(2);
    });
  });

  describe("addSubAgent", () => {
    it("should add a new sub-agent", () => {
      subAgentManager.addSubAgent(mockAgent1);
      expect(subAgentManager.getSubAgents().length).toBe(1);
      expect(subAgentManager.getSubAgents()[0]).toBe(mockAgent1);
    });
  });

  describe("removeSubAgent", () => {
    it("should remove an existing sub-agent", () => {
      subAgentManager.addSubAgent(mockAgent1);
      subAgentManager.addSubAgent(mockAgent2);
      expect(subAgentManager.getSubAgents().length).toBe(2);

      subAgentManager.removeSubAgent(mockAgent1.id);
      expect(subAgentManager.getSubAgents().length).toBe(1);
      expect(subAgentManager.getSubAgents()[0]).toBe(mockAgent2);
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

  describe("calculateMaxSteps", () => {
    it("should return default steps when no sub-agents", () => {
      expect(subAgentManager.calculateMaxSteps()).toBe(10);
    });

    it("should return multiplied steps when has sub-agents", () => {
      subAgentManager.addSubAgent(mockAgent1);
      subAgentManager.addSubAgent(mockAgent2);
      expect(subAgentManager.calculateMaxSteps()).toBe(20); // 10 * 2
    });
  });

  describe("generateSupervisorSystemMessage", () => {
    it("should return the original description if no sub-agents", () => {
      const subAgentManager = new SubAgentManager("TestAgent");
      const description = "Original description";

      // Call with empty agentsMemory string (default parameter)
      expect(subAgentManager.generateSupervisorSystemMessage(description)).toBe(description);
    });

    it("should generate a supervisor message when sub-agents exist", () => {
      const subAgentAgent1 = {
        id: "agent1",
        name: "Agent 1",
        instructions: "First agent",
      } as Agent<any>;
      const subAgentAgent2 = {
        id: "agent2",
        name: "Agent 2",
        instructions: "Second agent",
      } as Agent<any>;

      const subAgentManager = new SubAgentManager("TestAgent", [subAgentAgent1, subAgentAgent2]);
      const description = "Original description";

      // Call with empty agentsMemory string (default parameter)
      const result = subAgentManager.generateSupervisorSystemMessage(description);

      expect(result).toContain("You are a supervisor agent");
      expect(result).toContain("Agent 1: First agent");
      expect(result).toContain("Agent 2: Second agent");
      expect(result).toContain("<agents_memory>");
    });
  });

  describe("handoffTask", () => {
    it("should handoff task to target agent and pass supervisorUserContext as initialUserContext", async () => {
      const generateTextSpy = jest.spyOn(mockAgent1, "generateText");
      const supervisorContext = { supervisorKey: "supervisorValue" };
      type SupervisorContextType = typeof supervisorContext;

      const options: AgentHandoffOptions<SupervisorContextType> = {
        task: "Solve this math problem with supervisor context",
        targetAgent: mockAgent1,
        sharedContext: [],
        supervisorUserContext: supervisorContext,
      };

      const result = await subAgentManager.handoffTask<SupervisorContextType>(options);

      expect(generateTextSpy).toHaveBeenCalled();
      const generateTextCallArgs = generateTextSpy.mock.calls[0];
      const messages = generateTextCallArgs[0] as any[];
      const genOptions = generateTextCallArgs[1] as any;

      expect(messages[0].role).toBe("system");
      expect(messages[0].content).toContain("Task handed off from Main Agent to Math Agent");
      expect(genOptions.initialUserContext).toEqual(supervisorContext);
      expect(genOptions.initialUserContext?.supervisorKey).toBe("supervisorValue");

      expect(result.result).toBe("Response from Math Agent");
      expect(result.messages.length).toBe(2);
    });

    it("should handoff task without supervisorUserContext if not provided", async () => {
      const generateTextSpy = jest.spyOn(mockAgent1, "generateText");

      const options: AgentHandoffOptions = {
        task: "Solve this math problem",
        targetAgent: mockAgent1,
        sharedContext: [],
      };

      await subAgentManager.handoffTask(options);

      expect(generateTextSpy).toHaveBeenCalled();
      const genOptions = generateTextSpy.mock.calls[0][1] as any;
      expect(genOptions.initialUserContext).toBeUndefined();
    });
  });

  describe("handoffToMultiple", () => {
    it("should handoff task to multiple target agents and pass supervisorUserContext", async () => {
      const handoffTaskSpy = jest.spyOn(subAgentManager, "handoffTask");
      const supervisorContext = { multiHandoffKey: "multiValue" };
      type MultiContextType = typeof supervisorContext;

      const options = {
        task: "Process this request with context",
        targetAgents: [mockAgent1, mockAgent2],
        supervisorUserContext: supervisorContext,
      };

      await subAgentManager.handoffToMultiple<MultiContextType>(options);

      expect(handoffTaskSpy).toHaveBeenCalledTimes(2);
      expect(handoffTaskSpy.mock.calls[0][0].targetAgent).toBe(mockAgent1);
      expect(handoffTaskSpy.mock.calls[0][0].supervisorUserContext).toEqual(supervisorContext);
      expect(handoffTaskSpy.mock.calls[1][0].targetAgent).toBe(mockAgent2);
      expect(handoffTaskSpy.mock.calls[1][0].supervisorUserContext).toEqual(supervisorContext);
    });
  });

  describe("createDelegateTool", () => {
    it("should create a delegate tool with correct configuration", () => {
      const tool = subAgentManager.createDelegateTool();

      expect(tool.name).toBe("delegate_task");
      expect(tool.description).toContain("Delegate a task");

      const params = (tool.parameters as any).shape;
      expect(params.task).toBeDefined();
      expect(params.targetAgents).toBeDefined();
      expect(params.context).toBeDefined();
    });

    it("should throw error when executing with no valid agents", async () => {
      const tool = subAgentManager.createDelegateTool();

      await expect(
        tool.execute({
          task: "Test task",
          targetAgents: ["non-existent-agent"],
          context: {},
        }),
      ).resolves.toMatchObject({
        error: "Failed to delegate task: No valid target agents found. Available agents: ",
        status: "error",
      });
    });

    it("should execute and pass combined context (supervisor's userContext and LLM context) to handoffToMultiple", async () => {
      subAgentManager.addSubAgent(mockAgent1);
      subAgentManager.addSubAgent(mockAgent2);

      const mockSupervisorOperationalContext = {
        fromSupervisor: "importantData",
        commonKey: "supervisorValue",
      };
      const llmProvidedContext = { fromLLM: "llmData", commonKey: "llmValue" }; // LLM context overwrites commonKey
      type CombinedContextType = Partial<
        typeof mockSupervisorOperationalContext & typeof llmProvidedContext
      >;

      const mockOperationContext: OperationContext<typeof mockSupervisorOperationalContext> = {
        operationId: "test-op-id",
        userContext: mockSupervisorOperationalContext,
        historyEntry: {} as any,
        eventUpdaters: new Map(),
        isActive: true,
      };

      const handoffToMultipleSpy = jest
        .spyOn(subAgentManager, "handoffToMultiple")
        .mockResolvedValue([
          { result: "Result 1", conversationId: "conv1", messages: [], status: "success" },
          { result: "Result 2", conversationId: "conv2", messages: [], status: "success" },
        ]);

      const tool = subAgentManager.createDelegateTool({
        sourceAgent: new MockAgent("supervisorId", "Supervisor"),
        currentHistoryEntryId: "hist-entry-123",
        operationContext: mockOperationContext,
      });

      const result = await tool.execute({
        task: "Test task with combined context",
        targetAgents: ["Math Agent", "Writing Agent"],
        context: llmProvidedContext, // LLM provides its own context via the tool parameter
      });

      expect(handoffToMultipleSpy).toHaveBeenCalled();
      const handoffOptions = handoffToMultipleSpy.mock.calls[0][0];

      const expectedCombinedContext: CombinedContextType = {
        fromSupervisor: "importantData",
        fromLLM: "llmData",
        commonKey: "llmValue", // LLM's value for commonKey should take precedence
      };
      expect(handoffOptions.supervisorUserContext).toEqual(expectedCombinedContext);

      expect(result).toEqual([
        {
          agentName: "Math Agent",
          response: "Result 1",
          conversationId: "conv1",
          status: "success",
          error: undefined,
        },
        {
          agentName: "Writing Agent",
          response: "Result 2",
          conversationId: "conv2",
          status: "success",
          error: undefined,
        },
      ]);
    });

    it("should use only supervisor's userContext if LLM provides no context parameter", async () => {
      subAgentManager.addSubAgent(mockAgent1);
      const mockSupervisorOperationalContext = { fromSupervisor: "dataOnly" };
      const mockOperationContext: OperationContext<typeof mockSupervisorOperationalContext> = {
        operationId: "test-op-id-2",
        userContext: mockSupervisorOperationalContext,
        historyEntry: {} as any,
        eventUpdaters: new Map(),
        isActive: true,
      };

      const handoffToMultipleSpy = jest
        .spyOn(subAgentManager, "handoffToMultiple")
        .mockResolvedValue([
          { result: "Result Math", conversationId: "convM", messages: [], status: "success" },
        ]);

      const tool = subAgentManager.createDelegateTool({ operationContext: mockOperationContext });
      await tool.execute({ task: "Test no LLM context", targetAgents: ["Math Agent"] }); // No context from LLM

      expect(handoffToMultipleSpy).toHaveBeenCalled();
      const handoffOptions = handoffToMultipleSpy.mock.calls[0][0];
      expect(handoffOptions.supervisorUserContext).toEqual(mockSupervisorOperationalContext);
    });

    it("should use only LLM context if supervisor has no userContext (or operationContext is not passed to tool)", async () => {
      subAgentManager.addSubAgent(mockAgent1);
      const llmProvidedContext = { fromLLMOnly: "llmOnlyData" };

      const handoffToMultipleSpy = jest
        .spyOn(subAgentManager, "handoffToMultiple")
        .mockResolvedValue([
          {
            result: "Result Math LLM",
            conversationId: "convMLLM",
            messages: [],
            status: "success",
          },
        ]);

      // Create tool without operationContext (supervisorUserContext will be an empty object initially)
      const tool = subAgentManager.createDelegateTool({});
      await tool.execute({
        task: "Test only LLM context",
        targetAgents: ["Math Agent"],
        context: llmProvidedContext,
      });

      expect(handoffToMultipleSpy).toHaveBeenCalled();
      const handoffOptions = handoffToMultipleSpy.mock.calls[0][0];
      expect(handoffOptions.supervisorUserContext).toEqual(llmProvidedContext);
    });

    it("should execute delegate_task correctly even if operationContext is not in tool options (legacy or direct tool call)", async () => {
      subAgentManager.addSubAgent(mockAgent1);

      const handoffToMultipleSpy = jest
        .spyOn(subAgentManager, "handoffToMultiple")
        .mockResolvedValue([
          {
            result: "Result from Math",
            conversationId: "conv-math",
            messages: [],
            status: "success",
          },
        ]);

      const tool = subAgentManager.createDelegateTool({
        sourceAgent: new MockAgent("supervisorId", "Supervisor"),
      });

      const result = await tool.execute({
        task: "Test task no explicit supervisor context in tool options",
        targetAgents: ["Math Agent"],
      });

      expect(handoffToMultipleSpy).toHaveBeenCalled();
      const handoffOptions = handoffToMultipleSpy.mock.calls[0][0];
      expect(handoffOptions.supervisorUserContext).toEqual({});

      expect(result).toEqual([
        {
          agentName: "Math Agent",
          response: "Result from Math",
          conversationId: "conv-math",
          status: "success",
          error: undefined,
        },
      ]);
    });
  });

  describe("getSubAgentDetails", () => {
    it("should return formatted details of all sub-agents", () => {
      subAgentManager.addSubAgent(mockAgent1);
      subAgentManager.addSubAgent(mockAgent2);

      const details = subAgentManager.getSubAgentDetails();

      expect(details.length).toBe(2);
      expect(details[0].id).toBe("agent1");
      expect(details[0].name).toBe("Math Agent");
      expect(details[0].status).toBe("idle");
      expect(details[0].model).toBe("mock-model");
    });
  });
});

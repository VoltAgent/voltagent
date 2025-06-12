import type { Agent } from "../index";
import type { BaseMessage } from "../providers";
import type { AgentHandoffOptions } from "../types";
import { SubAgentManager } from "./index";

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

    it("should generate a supervisor message with the purpose of the sub-agents, if provided", () => {
      const subAgentAgent1 = {
        id: "agent1",
        name: "Agent 1",
        purpose: "First agent",
        instructions: "A very long instructions\nwith multiple lines\nand paragraphs",
      } as Agent<any>;
      const subAgentAgent2 = {
        id: "agent2",
        name: "Agent 2",
        instructions: "No purpose provided",
      } as Agent<any>;

      const subAgentManager = new SubAgentManager("TestAgent", [subAgentAgent1, subAgentAgent2]);
      const description = "Original description";

      // Call with empty agentsMemory string (default parameter)
      const result = subAgentManager.generateSupervisorSystemMessage(description);

      expect(result).toContain("You are a supervisor agent");
      expect(result).toContain("Agent 1: First agent");
      expect(result).toContain("Agent 2: No purpose provided");
      expect(result).toContain("<agents_memory>");
    });

    it("should match snapshot", () => {
      const subAgentAgent1 = {
        id: "agent1",
        name: "Agent 1",
        purpose: "First agent",
      } as Agent<any>;
      const subAgentManager = new SubAgentManager("TestAgent", [subAgentAgent1]);
      const description = "Some base instructions";
      const result = subAgentManager.generateSupervisorSystemMessage(description);
      expect(result).toMatchSnapshot();
    });
  });

  describe("handoffTask", () => {
    it("should handoff task to target agent", async () => {
      // Spy on generateText
      const generateTextSpy = jest.spyOn(mockAgent1, "generateText");

      const options: AgentHandoffOptions = {
        task: "Solve this math problem",
        targetAgent: mockAgent1,
        context: { problem: "2+2" },
        sharedContext: [],
      };

      const result = await subAgentManager.handoffTask(options);

      // Verify generateText was called with handoff message
      expect(generateTextSpy).toHaveBeenCalled();
      const messages = generateTextSpy.mock.calls[0][0] as any[];
      expect(messages[0].role).toBe("system");
      expect(messages[0].content).toContain("Task handed off from Main Agent to Math Agent");

      // Verify result
      expect(result.result).toBe("Response from Math Agent");
      expect(result.messages.length).toBe(2);
    });

    it("should call onHandoff hook with correct arguments when target agent has hooks", async () => {
      const onHandoffSpy = jest.fn();

      // Create a mock agent with hooks
      const mockAgentWithHooks = new MockAgent("agent3", "Agent with Hooks") as any;
      mockAgentWithHooks.hooks = {
        onHandoff: onHandoffSpy,
      };

      const sourceAgent = new MockAgent("source", "Source Agent") as any;

      const options: AgentHandoffOptions = {
        task: "Test handoff with hooks",
        targetAgent: mockAgentWithHooks,
        sourceAgent: sourceAgent,
        context: { test: "data" },
        sharedContext: [],
      };

      await subAgentManager.handoffTask(options);

      // Verify onHandoff was called with the correct object structure
      expect(onHandoffSpy).toHaveBeenCalledWith({
        agent: mockAgentWithHooks,
        source: sourceAgent,
      });
    });
  });

  describe("handoffToMultiple", () => {
    it("should handoff task to multiple target agents", async () => {
      const handoffTaskSpy = jest.spyOn(subAgentManager, "handoffTask");

      const options = {
        task: "Process this request",
        targetAgents: [mockAgent1, mockAgent2],
        context: { data: "test data" },
      };

      await subAgentManager.handoffToMultiple(options);

      // Verify handoffTask was called for each agent
      expect(handoffTaskSpy).toHaveBeenCalledTimes(2);
      expect(handoffTaskSpy.mock.calls[0][0].targetAgent).toBe(mockAgent1);
      expect(handoffTaskSpy.mock.calls[1][0].targetAgent).toBe(mockAgent2);
    });
  });

  describe("createDelegateTool", () => {
    it("should create a delegate tool with correct configuration", () => {
      const tool = subAgentManager.createDelegateTool();

      expect(tool.name).toBe("delegate_task");
      expect(tool.description).toContain("Delegate a task");

      // Verify parameters
      const params = (tool.parameters as any).shape;
      expect(params.task).toBeDefined();
      expect(params.targetAgents).toBeDefined();
      expect(params.context).toBeDefined();
    });

    it("should throw error when executing with no valid agents", async () => {
      const tool = subAgentManager.createDelegateTool();

      // Attempt to execute with non-existent agents
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

    it("should execute and return results when valid agents exist", async () => {
      subAgentManager.addSubAgent(mockAgent1);
      subAgentManager.addSubAgent(mockAgent2);

      const handoffToMultipleSpy = jest
        .spyOn(subAgentManager, "handoffToMultiple")
        .mockResolvedValue([
          {
            result: "Result 1",
            conversationId: "conv1",
            messages: [],
            error: undefined,
            status: "success",
          },
          {
            result: "Result 2",
            conversationId: "conv2",
            messages: [],
            error: undefined,
            status: "success",
          },
        ]);

      const tool = subAgentManager.createDelegateTool();

      const result = await tool.execute({
        task: "Test task",
        targetAgents: ["Math Agent", "Writing Agent"],
        context: {},
      });

      expect(handoffToMultipleSpy).toHaveBeenCalled();
      expect(result).toEqual([
        {
          agentName: "Math Agent",
          response: "Result 1",
          conversationId: "conv1",
          error: undefined,
          status: "success",
        },
        {
          agentName: "Writing Agent",
          response: "Result 2",
          conversationId: "conv2",
          error: undefined,
          status: "success",
        },
      ]);
      handoffToMultipleSpy.mockRestore();
    });

    it("should pass supervisor's userContext to sub-agents via handoffOptions", async () => {
      subAgentManager.addSubAgent(mockAgent1); // Math Agent

      // Spy on mockAgent1.generateText to check the options it receives
      const generateTextSpy = jest.spyOn(mockAgent1, "generateText");

      const supervisorUserContext = new Map<string | symbol, unknown>();
      supervisorUserContext.set("supervisorKey", "supervisorValue");

      // Mock the OperationContext that the delegate_tool would receive from the supervisor agent
      const mockSupervisorOperationContext = {
        operationId: "supervisor-op-id",
        userContext: supervisorUserContext,
        historyEntry: { id: "supervisor-history-id" }, // simplified mock
        eventUpdaters: new Map(),
        isActive: true,
      } as any; // Cast to any to simplify for test, real one is more complex

      // Create the delegate tool, providing the necessary options that would normally come from the Agent class
      const tool = subAgentManager.createDelegateTool({
        sourceAgent: { id: "supervisor-agent-id" }, // Simplified mock of sourceAgent
        operationContext: mockSupervisorOperationContext, // Pass the mocked supervisor's OperationContext
        currentHistoryEntryId: "supervisor-history-id",
      });

      await tool.execute({
        task: "Test task for userContext passing",
        targetAgents: ["Math Agent"], // Delegate to mockAgent1
        context: { someTaskContext: "taskSpecificData" },
      });

      // Check if handoffToMultiple was called (it internally calls handoffTask)
      // We are more interested in what generateText of the sub-agent receives
      expect(generateTextSpy).toHaveBeenCalled();

      // Check the options passed to mockAgent1.generateText
      const generateTextCallArgs = generateTextSpy.mock.calls[0];
      // Define types for the arguments received by the spy
      const messagesPassedToSubAgent = generateTextCallArgs[0] as BaseMessage[];
      const optionsPassedToSubAgent = generateTextCallArgs[1] as {
        userContext?: Map<string | symbol, unknown>;
      };

      // Verify the system message is part of what's passed
      expect(messagesPassedToSubAgent[0].role).toBe("system");
      expect(messagesPassedToSubAgent[0].content).toContain("Task handed off");

      // Verify the userContext from the supervisor was passed in the options
      expect(optionsPassedToSubAgent).toBeDefined();
      expect(optionsPassedToSubAgent.userContext).toBeDefined();
      expect(optionsPassedToSubAgent.userContext).toBeInstanceOf(Map);
      expect(optionsPassedToSubAgent.userContext?.get("supervisorKey")).toBe("supervisorValue");
      // It should be the same instance as it's directly passed through options in createDelegateTool to handoffToMultiple
      expect(optionsPassedToSubAgent.userContext).toBe(supervisorUserContext);

      generateTextSpy.mockRestore();
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

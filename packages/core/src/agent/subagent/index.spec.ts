import { SubAgentManager } from ".";
import type { AgentHandoffOptions } from "../types";

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
    it("should return original description when no sub-agents", () => {
      const description = "Original description";
      expect(subAgentManager.generateSupervisorSystemMessage(description)).toBe(description);
    });

    it("should return supervisor message when has sub-agents", () => {
      subAgentManager.addSubAgent(mockAgent1);
      subAgentManager.addSubAgent(mockAgent2);

      const description = "Original description";
      const result = subAgentManager.generateSupervisorSystemMessage(description);

      expect(result).toContain("supervisor agent");
      expect(result).toContain("Math Agent");
      expect(result).toContain("Writing Agent");
      expect(result).toContain(
        "Provide a final answer to the User when you have a response from all agents.",
      );
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
      ).rejects.toThrow("No valid target agents found");
    });

    it("should execute and return results when valid agents exist", async () => {
      subAgentManager.addSubAgent(mockAgent1);
      subAgentManager.addSubAgent(mockAgent2);

      const handoffToMultipleSpy = jest
        .spyOn(subAgentManager, "handoffToMultiple")
        .mockResolvedValue([
          { result: "Result 1", conversationId: "conv1", messages: [] },
          { result: "Result 2", conversationId: "conv2", messages: [] },
        ]);

      const tool = subAgentManager.createDelegateTool();

      const result = await tool.execute({
        task: "Test task",
        targetAgents: ["Math Agent", "Writing Agent"],
        context: {},
      });

      expect(handoffToMultipleSpy).toHaveBeenCalled();
      expect(result).toEqual([
        { agentName: "Math Agent", response: "Result 1", conversationId: "conv1" },
        { agentName: "Writing Agent", response: "Result 2", conversationId: "conv2" },
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

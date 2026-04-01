import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubAgentManager } from "./index";
import { createMockAgent, createMockAgentWithStubs } from "./test-utils";

describe("SubAgentManager - Bail System", () => {
  let subAgentManager: SubAgentManager;

  beforeEach(() => {
    vi.clearAllMocks();
    subAgentManager = new SubAgentManager("Supervisor", []);
  });

  describe("onHandoffComplete bail()", () => {
    it("should set bailed flag when bail() is called in hook", async () => {
      const mockSubAgent = createMockAgentWithStubs({
        id: "test-agent",
        name: "Test Agent",
      });

      const mockSupervisor = createMockAgent({
        id: "supervisor",
        name: "Supervisor",
        hooks: {
          onHandoffComplete: ({ bail }) => {
            bail("Early termination result");
          },
        },
      });

      const result = await subAgentManager.handoffTask({
        task: "Test task",
        targetAgent: mockSubAgent,
        sourceAgent: mockSupervisor,
      });

      expect(result.bailed).toBe(true);
      expect(result.result).toBe("Early termination result");
    });

    it("should return correct format with agentName when bailed", async () => {
      const mockAgent = createMockAgentWithStubs({
        id: "math-agent",
        name: "Math Agent",
      });

      const mockSupervisor = createMockAgent({
        name: "Supervisor",
        hooks: {
          onHandoffComplete: async ({ bail }) => {
            await bail("Final answer: 42");
          },
        },
      });

      subAgentManager.addSubAgent(mockAgent);
      const tool = subAgentManager.createDelegateTool({
        sourceAgent: mockSupervisor,
      });

      const result = await tool.execute?.({
        targetAgents: ["Math Agent"],
        task: "Calculate something",
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toEqual({
        agentName: "Math Agent",
        response: "Final answer: 42",
        usage: expect.any(Object),
        bailed: true,
      });
    });

    it("should not set bailed flag when bail() is not called", async () => {
      const mockSubAgent = createMockAgentWithStubs({
        name: "Normal Agent",
      });

      const mockSupervisor = createMockAgent({
        name: "Supervisor",
        hooks: {
          onHandoffComplete: async () => {
            // No bail
          },
        },
      });

      const result = await subAgentManager.handoffTask({
        task: "Normal task",
        targetAgent: mockSubAgent,
        sourceAgent: mockSupervisor,
      });

      expect(result.bailed).toBeUndefined();
    });
  });

  describe("Multiple agents bail", () => {
    it("should return bailed result when one agent bails in parallel execution", async () => {
      const bailingAgent = createMockAgentWithStubs({
        name: "Bailer",
      });

      const normalAgent = createMockAgentWithStubs({
        name: "Normal",
      });

      const mockSupervisor = createMockAgent({
        name: "Supervisor",
        hooks: {
          onHandoffComplete: async ({ agent, bail }) => {
            // Bail only for the Bailer agent
            if (agent.name === "Bailer") {
              await bail("First bail");
            }
          },
        },
      });

      subAgentManager.addSubAgent(bailingAgent);
      subAgentManager.addSubAgent(normalAgent);

      const results = await subAgentManager.handoffToMultiple({
        task: "Test",
        targetAgents: [bailingAgent, normalAgent],
        sourceAgent: mockSupervisor,
      });

      // Both execute in parallel, but one bails
      const bailedResult = results.find((r) => r.bailed);
      expect(bailedResult).toBeDefined();
      expect(bailedResult?.result).toBe("First bail");
    });

    it("should include all results when delegating to multiple agents", async () => {
      const agent1 = createMockAgentWithStubs({
        name: "Agent 1",
      });

      const agent2 = createMockAgentWithStubs({
        name: "Agent 2",
      });

      const mockSupervisor = createMockAgent({
        name: "Supervisor",
        hooks: {
          onHandoffComplete: async ({ agent, bail }) => {
            if (agent.name === "Agent 1") {
              await bail("Bail 1");
            }
          },
        },
      });

      subAgentManager.addSubAgent(agent1);
      subAgentManager.addSubAgent(agent2);

      const tool = subAgentManager.createDelegateTool({
        sourceAgent: mockSupervisor,
      });

      const result = await tool.execute?.({
        targetAgents: ["Agent 1", "Agent 2"],
        task: "Multi test",
      });

      expect(result).toHaveLength(2);
      expect(result[0].bailed).toBe(true);
      expect(result[1].bailed).toBeUndefined();
    });
  });
});

import { z } from "zod";
import { type AgentHooks, createHooks } from ".";
import type { AgentTool } from "../../tool";
import { Agent } from "../index";

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

describe("Agent Hooks Functionality", () => {
  let hooks: AgentHooks;
  let agent: Agent<any>;
  let sourceAgent: Agent<any>;
  let tool: AgentTool;

  beforeEach(() => {
    hooks = createHooks();
    agent = createTestAgent("TestAgent");
    sourceAgent = createTestAgent("SourceAgent");
    tool = {
      name: "test-tool",
      description: "A test tool",
      parameters: z.object({}),
      execute: jest.fn().mockResolvedValue("Tool result"),
    };

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
      await agent.hooks.onHandoff!(agent, sourceAgent);

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

      // Directly execute the hooks to test their functionality
      await agent.hooks.onToolStart?.(agent, tool);
      await agent.hooks.onToolEnd?.(agent, tool, "Tool result");

      // Verify hooks were called with correct arguments
      expect(onToolStartSpy).toHaveBeenCalledWith(agent, tool);
      expect(onToolEndSpy).toHaveBeenCalledWith(agent, tool, "Tool result");
    });
  });
});

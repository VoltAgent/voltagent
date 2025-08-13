import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { Agent } from "../agent/agent";
import type { UsageInfo } from "../agent/providers";
import { createTestLibSQLStorage } from "../test-utils/libsql-test-helpers";
import { createWorkflowChain } from "./chain";
import { WorkflowRegistry } from "./registry";

// Mock Agent for testing
class MockAgent extends Agent<any> {
  private mockUsage: UsageInfo;

  constructor(usage: UsageInfo) {
    super({
      name: "MockAgent",
      instructions: "Mock agent for testing",
      llm: {
        getModelIdentifier: () => "mock-model",
      } as any, // Mock LLM
      model: {} as any, // Mock model
    });
    this.mockUsage = usage;
  }

  async generateObject(_input: any, _schema: any, _options?: any) {
    return {
      object: { result: "mocked" },
      usage: this.mockUsage,
      provider: "mock" as any,
      userContext: new Map(),
    };
  }
}

describe("workflow usage tracking", () => {
  beforeEach(() => {
    const registry = WorkflowRegistry.getInstance();
    (registry as any).workflows.clear();
  });

  it("should track usage from single andAgent step", async () => {
    const mockAgent = new MockAgent({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    });

    const memory = createTestLibSQLStorage("usage_single_agent");
    const workflow = createWorkflowChain({
      id: "single-agent",
      name: "Single Agent",
      input: z.object({ prompt: z.string() }),
      result: z.object({ result: z.string() }),
      memory,
    }).andAgent(async ({ data }) => data.prompt, mockAgent, {
      schema: z.object({ result: z.string() }),
    });

    // Register workflow to registry
    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow.toWorkflow());

    const execution = await workflow.run({ prompt: "test" });

    expect(execution.usage).toEqual({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    });
  });

  it("should accumulate usage from multiple andAgent steps", async () => {
    const agent1 = new MockAgent({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    });

    const agent2 = new MockAgent({
      promptTokens: 200,
      completionTokens: 100,
      totalTokens: 300,
    });

    const agent3 = new MockAgent({
      promptTokens: 50,
      completionTokens: 25,
      totalTokens: 75,
    });

    const memory = createTestLibSQLStorage("usage_multi_agent");
    const workflow = createWorkflowChain({
      id: "multi-agent",
      name: "Multi Agent",
      input: z.object({ text: z.string() }),
      result: z.object({ final: z.string() }),
      memory,
    })
      .andAgent(async ({ data }) => `First: ${data.text}`, agent1, {
        schema: z.object({ result: z.string() }),
      })
      .andAgent(async ({ data }) => `Second: ${data.result}`, agent2, {
        schema: z.object({ result: z.string() }),
      })
      .andAgent(async ({ data }) => `Third: ${data.result}`, agent3, {
        schema: z.object({ final: z.string() }),
      });

    // Register workflow to registry
    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow.toWorkflow());

    const execution = await workflow.run({ text: "test" });

    // Total should be sum of all agents
    expect(execution.usage).toEqual({
      promptTokens: 350, // 100 + 200 + 50
      completionTokens: 175, // 50 + 100 + 25
      totalTokens: 525, // 150 + 300 + 75
    });
  });

  it("should have zero usage when no andAgent steps", async () => {
    const memory = createTestLibSQLStorage("usage_no_agents");
    const workflow = createWorkflowChain({
      id: "no-agents",
      name: "No Agents",
      input: z.object({ value: z.number() }),
      result: z.object({ doubled: z.number() }),
      memory,
    })
      .andThen({
        id: "double",
        execute: async ({ data }) => ({ doubled: data.value * 2 }),
      })
      .andThen({
        id: "add-one",
        execute: async ({ data }) => ({ doubled: data.doubled + 1 }),
      });

    // Register workflow to registry
    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow.toWorkflow());

    const execution = await workflow.run({ value: 5 });

    expect(execution.usage).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    });
  });

  it("should not track usage from custom agent calls in andThen", async () => {
    const customAgent = new MockAgent({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    });

    const memory = createTestLibSQLStorage("usage_custom_call");
    const workflow = createWorkflowChain({
      id: "custom-agent-call",
      name: "Custom Agent Call",
      input: z.object({ text: z.string() }),
      result: z.object({ result: z.string() }),
      memory,
    }).andThen({
      id: "custom-call",
      execute: async ({ data }) => {
        // Custom agent call - should NOT be tracked
        const response = await customAgent.generateObject(
          data.text,
          z.object({ result: z.string() }),
        );
        return response.object;
      },
    });

    // Register workflow to registry
    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow.toWorkflow());

    const execution = await workflow.run({ text: "test" });

    // Usage should be zero since we didn't use andAgent
    expect(execution.usage).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    });
  });

  it("should handle mixed steps with some andAgent", async () => {
    const agent = new MockAgent({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    });

    const memory = createTestLibSQLStorage("usage_mixed_steps");
    const workflow = createWorkflowChain({
      id: "mixed-steps",
      name: "Mixed Steps",
      input: z.object({ value: z.number() }),
      result: z.object({ final: z.string() }),
      memory,
    })
      .andThen({
        id: "transform",
        execute: async ({ data }) => ({ text: `Value: ${data.value}` }),
      })
      .andAgent(async ({ data }) => data.text, agent, {
        schema: z.object({ analysis: z.string() }),
      })
      .andThen({
        id: "finalize",
        execute: async ({ data }) => ({ final: data.analysis.toUpperCase() }),
      });

    // Register workflow to registry
    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow.toWorkflow());

    const execution = await workflow.run({ value: 42 });

    expect(execution.usage).toEqual({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    });
  });

  it("should make usage available in state during execution", async () => {
    const agent1 = new MockAgent({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    });

    const agent2 = new MockAgent({
      promptTokens: 200,
      completionTokens: 100,
      totalTokens: 300,
    });

    let usageAfterFirstAgent: UsageInfo | undefined;
    let usageAfterSecondAgent: UsageInfo | undefined;

    const memory = createTestLibSQLStorage("usage_state_usage");
    const workflow = createWorkflowChain({
      id: "state-usage",
      name: "State Usage",
      input: z.object({ text: z.string() }),
      result: z.object({ result: z.string() }),
      memory,
    })
      .andAgent(async ({ data }) => data.text, agent1, {
        schema: z.object({ result: z.string() }),
      })
      .andThen({
        id: "check-usage-1",
        execute: async ({ data, state }) => {
          // Deep clone the usage to avoid reference issues
          usageAfterFirstAgent = { ...state.usage };
          return data;
        },
      })
      .andAgent(async ({ data }) => data.result, agent2, {
        schema: z.object({ result: z.string() }),
      })
      .andThen({
        id: "check-usage-2",
        execute: async ({ data, state }) => {
          // Deep clone the usage to avoid reference issues
          usageAfterSecondAgent = { ...state.usage };
          return data;
        },
      });

    // Register workflow to registry
    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow.toWorkflow());

    await workflow.run({ text: "test" });

    // After first agent
    expect(usageAfterFirstAgent).toEqual({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    });

    // After second agent (accumulated)
    expect(usageAfterSecondAgent).toEqual({
      promptTokens: 300, // 100 + 200
      completionTokens: 150, // 50 + 100
      totalTokens: 450, // 150 + 300
    });
  });

  it("should handle agents with undefined usage gracefully", async () => {
    // Agent that doesn't return usage
    const agentWithoutUsage = new MockAgent({} as any);
    agentWithoutUsage.generateObject = async () => ({
      object: { result: "no usage" },
      usage: undefined as any,
      provider: "mock" as any,
      userContext: new Map(),
    });

    const agentWithUsage = new MockAgent({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    });

    const memory = createTestLibSQLStorage("usage_partial_usage");
    const workflow = createWorkflowChain({
      id: "partial-usage",
      name: "Partial Usage",
      input: z.object({ text: z.string() }),
      result: z.object({ result: z.string() }),
      memory,
    })
      .andAgent(async ({ data }) => data.text, agentWithoutUsage, {
        schema: z.object({ result: z.string() }),
      })
      .andAgent(async ({ data }) => data.result, agentWithUsage, {
        schema: z.object({ result: z.string() }),
      });

    // Register workflow to registry
    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow.toWorkflow());

    const execution = await workflow.run({ text: "test" });

    // Should only count the agent with usage
    expect(execution.usage).toEqual({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    });
  });

  it("should handle partial usage info correctly", async () => {
    // Agent with only some usage fields
    const partialUsageAgent = new MockAgent({
      promptTokens: 100,
    } as any);

    const memory = createTestLibSQLStorage("usage_partial_fields");
    const workflow = createWorkflowChain({
      id: "partial-fields",
      name: "Partial Fields",
      input: z.object({ text: z.string() }),
      result: z.object({ result: z.string() }),
      memory,
    }).andAgent(async ({ data }) => data.text, partialUsageAgent, {
      schema: z.object({ result: z.string() }),
    });

    // Register workflow to registry
    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow.toWorkflow());

    const execution = await workflow.run({ text: "test" });

    expect(execution.usage).toEqual({
      promptTokens: 100,
      completionTokens: 0, // Default to 0
      totalTokens: 0, // Default to 0
    });
  });
});

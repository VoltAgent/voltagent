import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { Agent } from "./agent/agent";
import { Memory } from "./memory";
import { InMemoryStorageAdapter } from "./memory/adapters/storage/in-memory";
import { AgentRegistry } from "./registries/agent-registry";
import { VoltAgent } from "./voltagent";
import { createWorkflow } from "./workflow";
import { WorkflowRegistry } from "./workflow/registry";
import { andThen } from "./workflow/steps";

const resetRegistries = () => {
  const agentRegistry = AgentRegistry.getInstance() as {
    agents?: Map<string, unknown>;
    agentRelationships?: Map<string, unknown>;
  };
  agentRegistry.agents?.clear();
  agentRegistry.agentRelationships?.clear();
  AgentRegistry.getInstance().setGlobalAgentMemory(undefined);
  AgentRegistry.getInstance().setGlobalWorkflowMemory(undefined);
  AgentRegistry.getInstance().setGlobalMemory(undefined);

  const workflowRegistry = WorkflowRegistry.getInstance() as {
    workflows?: Map<string, unknown>;
    activeExecutions?: Map<string, unknown>;
  };
  workflowRegistry.workflows?.clear();
  workflowRegistry.activeExecutions?.clear();
};

describe("VoltAgent defaults", () => {
  beforeEach(() => {
    resetRegistries();
  });

  afterEach(() => {
    resetRegistries();
  });

  it("applies agentMemory to registered agents without explicit memory", () => {
    const agentMemory = new Memory({ storage: new InMemoryStorageAdapter() });
    const agent = new Agent({
      name: "assistant",
      instructions: "Be helpful.",
      model: "openai/gpt-4o-mini",
    });

    new VoltAgent({
      agents: { assistant: agent },
      agentMemory,
      checkDependencies: false,
    });

    expect(agent.getMemory()).toBe(agentMemory);
  });

  it("applies workflowMemory to registered workflows without explicit memory", () => {
    const workflowMemory = new Memory({ storage: new InMemoryStorageAdapter() });
    const workflow = createWorkflow(
      {
        id: "workflow-default-memory",
        name: "Workflow Default Memory",
        input: z.object({ value: z.string() }),
        result: z.object({ value: z.string() }),
      },
      andThen({
        id: "echo",
        execute: async ({ data }) => data,
      }),
    );

    new VoltAgent({
      workflows: { workflow },
      workflowMemory,
      checkDependencies: false,
    });

    expect(workflow.memory).toBe(workflowMemory);
  });

  it("uses shared memory as fallback for agents and workflows", () => {
    const sharedMemory = new Memory({ storage: new InMemoryStorageAdapter() });
    const agent = new Agent({
      name: "assistant",
      instructions: "Be helpful.",
      model: "openai/gpt-4o-mini",
    });
    const workflow = createWorkflow(
      {
        id: "workflow-shared-memory",
        name: "Workflow Shared Memory",
        input: z.object({ value: z.string() }),
        result: z.object({ value: z.string() }),
      },
      andThen({
        id: "echo",
        execute: async ({ data }) => data,
      }),
    );

    new VoltAgent({
      agents: { assistant: agent },
      workflows: { workflow },
      memory: sharedMemory,
      checkDependencies: false,
    });

    expect(agent.getMemory()).toBe(sharedMemory);
    expect(workflow.memory).toBe(sharedMemory);
  });
});

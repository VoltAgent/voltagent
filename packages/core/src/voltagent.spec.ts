import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Agent } from "./agent/agent";
import { Memory } from "./memory";
import { InMemoryStorageAdapter } from "./memory/adapters/storage/in-memory";
import { ServerlessVoltAgentObservability } from "./observability";
import { AgentRegistry } from "./registries/agent-registry";
import { VoltAgent } from "./voltagent";
import { VoltOpsClient } from "./voltops/client";
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

  it("applies default agent conversation persistence when agent does not configure it", () => {
    const agent = new Agent({
      name: "assistant",
      instructions: "Be helpful.",
      model: "openai/gpt-4o-mini",
    });

    new VoltAgent({
      agents: { assistant: agent },
      agentConversationPersistence: {
        mode: "finish",
        debounceMs: 10,
        flushOnToolResult: false,
      },
      checkDependencies: false,
    });

    expect((agent as any).conversationPersistence).toMatchObject({
      mode: "finish",
      debounceMs: 10,
      flushOnToolResult: false,
    });
  });

  it("preserves explicit agent conversation persistence config", () => {
    const agent = new Agent({
      name: "assistant",
      instructions: "Be helpful.",
      model: "openai/gpt-4o-mini",
      conversationPersistence: {
        mode: "step",
        debounceMs: 25,
        flushOnToolResult: true,
      },
    });

    new VoltAgent({
      agents: { assistant: agent },
      agentConversationPersistence: {
        mode: "finish",
        debounceMs: 0,
        flushOnToolResult: false,
      },
      checkDependencies: false,
    });

    expect((agent as any).conversationPersistence).toMatchObject({
      mode: "step",
      debounceMs: 25,
      flushOnToolResult: true,
    });
  });

  it("does not recreate serverless observability remote config when unchanged", async () => {
    const observability = new ServerlessVoltAgentObservability();
    const updateSpy = vi.spyOn(observability, "updateServerlessRemote");

    const mockVoltOpsClient = new VoltOpsClient({
      baseUrl: "https://api.voltops.example",
      publicKey: "pk_test_public_key",
      secretKey: "sk_test_secret_key",
    });

    let ensureEnvironmentHook: ((env?: Record<string, unknown>) => void) | undefined;

    const voltAgent = new VoltAgent({
      observability,
      voltOpsClient: mockVoltOpsClient,
      checkDependencies: false,
      serverless: (deps) => {
        ensureEnvironmentHook = deps.ensureEnvironment;
        return {
          handleRequest: async () => new Response(null, { status: 200 }),
          toCloudflareWorker: () => ({
            fetch: async () => new Response(null, { status: 200 }),
          }),
          toVercelEdge: () => async () => new Response(null, { status: 200 }),
          toDeno: () => async () => new Response(null, { status: 200 }),
          auto: () => ({
            fetch: async () => new Response(null, { status: 200 }),
          }),
        };
      },
    });

    await voltAgent.ready;
    expect(updateSpy).toHaveBeenCalledTimes(1);

    ensureEnvironmentHook?.();
    ensureEnvironmentHook?.();

    expect(updateSpy).toHaveBeenCalledTimes(1);
    await observability.shutdown();
  });
});

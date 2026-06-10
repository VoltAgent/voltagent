import { Memory } from "@voltagent/core";
import type { Agent, Logger, ServerProviderDeps, VoltOpsClient } from "@voltagent/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryStorageAdapter } from "../../../core/src/memory/adapters/storage/in-memory";
import {
  handleDeleteMemoryConversation,
  handleGetMemoryConversation,
  handleGetMemoryWorkingMemory,
  handleListMemoryConversationMessages,
  handleListMemoryConversations,
} from "./memory.handlers";

function createAgentWithMemory(agentId: string, agentName: string, memory: Memory): Agent {
  return {
    getFullState: () => ({
      id: agentId,
      name: agentName,
      instructions: "",
      status: "idle",
      model: "test-model",
      tools: [],
      subAgents: [],
      memory: {},
    }),
    getMemory: () => memory,
  } as unknown as Agent;
}

function createDepsWithAgents(agents: Agent[]): ServerProviderDeps {
  const logger: Logger = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
    level: "info",
    silent: vi.fn(),
  } as unknown as Logger;

  return {
    agentRegistry: {
      getAgent: vi.fn((agentId: string) =>
        agents.find((agent) => agent.getFullState().id === agentId),
      ),
      getAllAgents: vi.fn().mockReturnValue(agents),
      getAgentCount: vi.fn().mockReturnValue(agents.length),
      removeAgent: vi.fn(),
      registerAgent: vi.fn(),
      getGlobalVoltOpsClient: vi.fn().mockReturnValue(undefined as unknown as VoltOpsClient),
      getGlobalLogger: vi.fn().mockReturnValue(logger),
    },
    workflowRegistry: {
      getWorkflow: vi.fn(),
      getWorkflowsForApi: vi.fn().mockReturnValue([]),
      getWorkflowDetailForApi: vi.fn(),
      getWorkflowCount: vi.fn().mockReturnValue(0),
      on: vi.fn(),
      off: vi.fn(),
      activeExecutions: new Map(),
      resumeSuspendedWorkflow: vi.fn(),
    },
    triggerRegistry: {
      list: vi.fn().mockReturnValue([]),
      register: vi.fn(),
      registerMany: vi.fn(),
      get: vi.fn(),
      getByPath: vi.fn(),
      unregister: vi.fn(),
      clear: vi.fn(),
    } as any,
    logger,
  } as unknown as ServerProviderDeps;
}

function expectForbidden(result: { success: boolean; httpStatus?: number }) {
  expect(result.success).toBe(false);
  if (result.success) {
    return;
  }
  expect(result.httpStatus).toBe(403);
}

describe("memory handlers authorization", () => {
  let memory: Memory;
  let deps: ServerProviderDeps;

  const agentId = "agent-1";
  const victimUserId = "victim-user";
  const attackerUserId = "attacker-user";
  const victimConversationId = "conv-victim";
  const attackerConversationId = "conv-attacker";

  beforeEach(async () => {
    memory = new Memory({
      storage: new InMemoryStorageAdapter(),
      workingMemory: {
        enabled: true,
        scope: "conversation",
      },
    });

    await memory.createConversation({
      id: victimConversationId,
      resourceId: agentId,
      userId: victimUserId,
      title: "Victim Chat",
      metadata: {},
    });

    await memory.addMessage(
      {
        id: "victim-msg-1",
        role: "user",
        parts: [{ type: "text", text: "private message" }],
      },
      victimUserId,
      victimConversationId,
    );

    await memory.updateWorkingMemory({
      conversationId: victimConversationId,
      userId: victimUserId,
      content: "Private working memory",
    });

    await memory.createConversation({
      id: attackerConversationId,
      resourceId: agentId,
      userId: attackerUserId,
      title: "Attacker Chat",
      metadata: {},
    });

    const agent = createAgentWithMemory(agentId, "Agent One", memory);
    deps = createDepsWithAgents([agent]);
  });

  it("rejects cross-user conversation reads", async () => {
    const result = await handleGetMemoryConversation(deps, victimConversationId, {
      agentId,
      authenticatedUser: { id: attackerUserId },
    });

    expectForbidden(result);
  });

  it("rejects cross-user message listing without trusting the conversation owner fallback", async () => {
    const result = await handleListMemoryConversationMessages(deps, victimConversationId, {
      agentId,
      authenticatedUser: { id: attackerUserId },
    });

    expectForbidden(result);
  });

  it("rejects cross-user conversation-scoped working memory reads", async () => {
    const result = await handleGetMemoryWorkingMemory(deps, victimConversationId, {
      agentId,
      authenticatedUser: { id: attackerUserId },
    });

    expectForbidden(result);
  });

  it("rejects cross-user conversation deletes and leaves the conversation intact", async () => {
    const deleteResult = await handleDeleteMemoryConversation(deps, victimConversationId, {
      agentId,
      authenticatedUser: { id: attackerUserId },
    });

    expectForbidden(deleteResult);

    const readResult = await handleGetMemoryConversation(deps, victimConversationId, {
      agentId,
      authenticatedUser: { id: victimUserId },
    });

    expect(readResult.success).toBe(true);
    if (!readResult.success) {
      return;
    }
    expect(readResult.data.conversation.userId).toBe(victimUserId);
  });

  it("scopes conversation lists to the authenticated user", async () => {
    const result = await handleListMemoryConversations(deps, {
      agentId,
      authenticatedUser: { id: attackerUserId },
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    expect(result.data.conversations).toHaveLength(1);
    expect(result.data.conversations[0]?.id).toBe(attackerConversationId);
  });

  it("rejects authenticated requests that specify another userId", async () => {
    const result = await handleListMemoryConversations(deps, {
      agentId,
      userId: victimUserId,
      authenticatedUser: { id: attackerUserId },
    });

    expectForbidden(result);
  });
});

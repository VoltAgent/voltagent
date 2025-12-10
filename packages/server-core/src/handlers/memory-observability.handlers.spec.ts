import { Memory } from "@voltagent/core";
import type { Agent, Logger, ServerProviderDeps, VoltOpsClient } from "@voltagent/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryStorageAdapter } from "../../../core/src/memory/adapters/storage/in-memory";
import {
  getConversationMessagesHandler,
  getWorkingMemoryHandler,
  listMemoryConversationsHandler,
  listMemoryUsersHandler,
} from "./memory-observability.handlers";

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
      getAgent: vi.fn(),
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

describe("memory observability handlers", () => {
  let memory: Memory;
  let deps: ServerProviderDeps;
  const agentId = "agent-1";
  const agentName = "Agent One";
  const userId = "user-1";
  const conversationId = "conv-1";

  beforeEach(async () => {
    memory = new Memory({
      storage: new InMemoryStorageAdapter(),
      workingMemory: {
        enabled: true,
        scope: "conversation",
      },
    });

    await memory.createConversation({
      id: conversationId,
      resourceId: agentId,
      userId,
      title: "Support Chat",
      metadata: {},
    });

    await memory.addMessage(
      {
        id: "msg-1",
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
      },
      userId,
      conversationId,
    );

    await memory.addMessage(
      {
        id: "msg-2",
        role: "assistant",
        parts: [{ type: "text", text: "Hi there" }],
      },
      userId,
      conversationId,
    );

    await memory.updateWorkingMemory({
      conversationId,
      userId,
      content: "User prefers concise answers",
    });

    const agent = createAgentWithMemory(agentId, agentName, memory);
    deps = createDepsWithAgents([agent]);
  });

  it("lists memory users", async () => {
    const result = await listMemoryUsersHandler(deps, {});
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.total).toBe(1);
    expect(result.data.users[0]?.userId).toBe(userId);
    expect(result.data.users[0]?.conversationCount).toBe(1);
  });

  it("lists memory conversations", async () => {
    const result = await listMemoryConversationsHandler(deps, {});
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.total).toBe(1);
    expect(result.data.conversations[0]?.id).toBe(conversationId);
    expect(result.data.conversations[0]?.agentId).toBe(agentId);
  });

  it("returns conversation messages", async () => {
    const result = await getConversationMessagesHandler(deps, conversationId, {});
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.conversation.userId).toBe(userId);
    expect(result.data.messages).toHaveLength(2);
    expect(result.data.messages[0]?.parts[0]?.type).toBe("text");
  });

  it("returns working memory content", async () => {
    const result = await getWorkingMemoryHandler(deps, {
      scope: "conversation",
      conversationId,
      userId,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.content).toContain("concise answers");
    expect(result.data.scope).toBe("conversation");
  });

  it("returns success with null content when user working memory is missing", async () => {
    const result = await getWorkingMemoryHandler(deps, {
      scope: "user",
      userId: "non-existent-user",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.scope).toBe("user");
    expect(result.data.content).toBeNull();
  });

  it("returns success with null content when no agents are available", async () => {
    const emptyDeps = createDepsWithAgents([]);
    const result = await getWorkingMemoryHandler(emptyDeps, {
      scope: "user",
      userId: "someone",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.agentId).toBeNull();
    expect(result.data.content).toBeNull();
  });
});

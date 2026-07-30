import { Memory } from "@voltagent/core";
import type { Agent, Logger, ServerProviderDeps, VoltOpsClient } from "@voltagent/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryStorageAdapter } from "../../../core/src/memory/adapters/storage/in-memory";
import {
  handleDeleteMemoryConversation,
  handleGetMemoryConversation,
  handleListMemoryConversationMessages,
  handleUpdateMemoryConversation,
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

describe("memory handlers ownership checks", () => {
  let memory: Memory;
  let deps: ServerProviderDeps;
  const agentId = "agent-1";
  const ownerUserId = "user-alice";
  const otherUserId = "user-bob";
  const conversationId = "conv-private";

  beforeEach(async () => {
    memory = new Memory({
      storage: new InMemoryStorageAdapter(),
    });

    await memory.createConversation({
      id: conversationId,
      resourceId: agentId,
      userId: ownerUserId,
      title: "Alice Private",
      metadata: {},
    });

    await memory.addMessage(
      {
        id: "msg-1",
        role: "user",
        parts: [{ type: "text", text: "Confidential" }],
      },
      ownerUserId,
      conversationId,
    );

    deps = createDepsWithAgents([createAgentWithMemory(agentId, "Agent One", memory)]);
  });

  it("rejects reading a conversation owned by a different authenticated user", async () => {
    const result = await handleGetMemoryConversation(deps, conversationId, {
      agentId,
      requestingUserId: otherUserId,
    });

    expect(result.success).toBe(false);
    expect(result.httpStatus).toBe(403);
  });

  it("rejects listing messages for a conversation owned by a different authenticated user", async () => {
    const result = await handleListMemoryConversationMessages(deps, conversationId, {
      agentId,
      requestingUserId: otherUserId,
    });

    expect(result.success).toBe(false);
    expect(result.httpStatus).toBe(403);
  });

  it("rejects updating a conversation owned by a different authenticated user", async () => {
    const result = await handleUpdateMemoryConversation(deps, conversationId, {
      agentId,
      requestingUserId: otherUserId,
      title: "Bob title",
    } as any);

    expect(result.success).toBe(false);
    expect(result.httpStatus).toBe(403);

    const conversation = await memory.getConversation(conversationId);
    expect(conversation?.title).toBe("Alice Private");
  });

  it("rejects deleting a conversation owned by a different authenticated user", async () => {
    const result = await handleDeleteMemoryConversation(deps, conversationId, {
      agentId,
      requestingUserId: otherUserId,
    });

    expect(result.success).toBe(false);
    expect(result.httpStatus).toBe(403);

    await expect(memory.getConversation(conversationId)).resolves.not.toBeNull();
  });

  it("allows the owning authenticated user to manage the conversation", async () => {
    const result = await handleGetMemoryConversation(deps, conversationId, {
      agentId,
      requestingUserId: ownerUserId,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.conversation.userId).toBe(ownerUserId);
  });
});

import { ConversationOwnershipMismatchError } from "@voltagent/core";
import { describe, expect, it, vi } from "vitest";
import { ManagedMemoryAdapter } from "./index";

function createVoltOpsClient() {
  const conversations = {
    create: vi.fn(),
    get: vi.fn(),
    query: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  return {
    client: {
      hasValidKeys: vi.fn(() => true),
      listManagedMemoryDatabases: vi.fn().mockResolvedValue([
        {
          id: "db-1",
          name: "primary",
          region: "test",
          connection: {},
        },
      ]),
      managedMemory: {
        conversations,
        messages: {
          add: vi.fn(),
          addBatch: vi.fn(),
          list: vi.fn(),
          clear: vi.fn(),
          delete: vi.fn(),
        },
        workingMemory: {
          get: vi.fn(),
          set: vi.fn(),
          delete: vi.fn(),
        },
        workflowStates: {
          get: vi.fn(),
          set: vi.fn(),
          update: vi.fn(),
          list: vi.fn(),
          query: vi.fn(),
          listSuspended: vi.fn(),
        },
        steps: {
          save: vi.fn(),
          list: vi.fn(),
        },
        vectors: {
          store: vi.fn(),
          storeBatch: vi.fn(),
          search: vi.fn(),
          get: vi.fn(),
          delete: vi.fn(),
          deleteBatch: vi.fn(),
          clear: vi.fn(),
          count: vi.fn(),
        },
      },
    } as any,
    conversations,
  };
}

describe("ManagedMemoryAdapter conversation ownership guards", () => {
  it("rejects guarded updates before delegating when the owner does not match", async () => {
    const { client, conversations } = createVoltOpsClient();
    conversations.get.mockResolvedValue({
      id: "conv-1",
      userId: "user-2",
      resourceId: "agent-1",
      title: "Private",
      metadata: {},
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });

    const adapter = new ManagedMemoryAdapter({ databaseId: "db-1", voltOpsClient: client });

    await expect(
      adapter.updateConversation("conv-1", { title: "Updated" }, { expectedUserId: "user-1" }),
    ).rejects.toBeInstanceOf(ConversationOwnershipMismatchError);

    expect(conversations.update).not.toHaveBeenCalled();
  });

  it("checks ownership before delegated deletes", async () => {
    const { client, conversations } = createVoltOpsClient();
    conversations.get.mockResolvedValue({
      id: "conv-1",
      userId: "user-1",
      resourceId: "agent-1",
      title: "Private",
      metadata: {},
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });
    conversations.delete.mockResolvedValue(undefined);

    const adapter = new ManagedMemoryAdapter({ databaseId: "db-1", voltOpsClient: client });

    await expect(
      adapter.deleteConversation("conv-1", { expectedUserId: "user-1" }),
    ).resolves.toBeUndefined();

    expect(conversations.get).toHaveBeenCalledWith("db-1", "conv-1");
    expect(conversations.delete).toHaveBeenCalledWith("db-1", "conv-1");
  });
});

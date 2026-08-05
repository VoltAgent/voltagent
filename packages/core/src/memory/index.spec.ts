import type { UIMessage } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryStorageAdapter } from "./adapters/storage/in-memory";
import { InMemoryVectorAdapter } from "./adapters/vector/in-memory";
import { Memory } from "./index";

describe("Memory conversation mutation guards", () => {
  let storage: InMemoryStorageAdapter;
  let vector: InMemoryVectorAdapter;
  let memory: Memory;

  beforeEach(async () => {
    storage = new InMemoryStorageAdapter();
    vector = new InMemoryVectorAdapter();
    memory = new Memory({
      storage,
      vector,
    });

    await memory.createConversation({
      id: "conv-1",
      userId: "user-1",
      resourceId: "agent-1",
      title: "Conversation",
      metadata: {},
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("continues unguarded deletes when vector cleanup cannot read the conversation", async () => {
    const readError = new Error("read unavailable");
    const getSpy = vi.spyOn(storage, "getConversation").mockRejectedValueOnce(readError);
    const deleteSpy = vi.spyOn(storage, "deleteConversation");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(memory.deleteConversation("conv-1")).resolves.toBeUndefined();

    expect(getSpy).toHaveBeenCalledWith("conv-1");
    expect(deleteSpy).toHaveBeenCalledWith("conv-1", undefined);
    expect(warnSpy).toHaveBeenCalledWith(
      "Failed to delete vectors for conversation conv-1:",
      readError,
    );
    await expect(storage.getConversation("conv-1")).resolves.toBeNull();
  });

  it("does not re-read vectors for guarded deletes when ownership lookup finds no conversation", async () => {
    const replacementConversation = {
      id: "conv-1",
      userId: "user-2",
      resourceId: "agent-1",
      title: "Replacement",
      metadata: {},
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
    const deleteError = new Error("missing conversation");
    const getSpy = vi
      .spyOn(storage, "getConversation")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(replacementConversation);
    const secretMessage: UIMessage<{ createdAt: Date }> = {
      id: "msg-1",
      role: "user",
      parts: [{ type: "text", text: "secret" }],
      metadata: { createdAt: new Date() },
    };
    const getMessagesSpy = vi.spyOn(storage, "getMessages").mockResolvedValueOnce([secretMessage]);
    const deleteBatchSpy = vi.spyOn(vector, "deleteBatch");
    vi.spyOn(storage, "deleteConversation").mockRejectedValueOnce(deleteError);

    await expect(memory.deleteConversation("conv-1", { expectedUserId: "user-1" })).rejects.toThrow(
      deleteError,
    );

    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(getMessagesSpy).not.toHaveBeenCalled();
    expect(deleteBatchSpy).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryStorageAdapter } from "./adapters/storage/in-memory";
import { InMemoryVectorAdapter } from "./adapters/vector/in-memory";
import { Memory } from "./index";

describe("Memory conversation mutation guards", () => {
  let storage: InMemoryStorageAdapter;
  let memory: Memory;

  beforeEach(async () => {
    storage = new InMemoryStorageAdapter();
    memory = new Memory({
      storage,
      vector: new InMemoryVectorAdapter(),
    });

    await memory.createConversation({
      id: "conv-1",
      userId: "user-1",
      resourceId: "agent-1",
      title: "Conversation",
      metadata: {},
    });
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

    warnSpy.mockRestore();
  });
});

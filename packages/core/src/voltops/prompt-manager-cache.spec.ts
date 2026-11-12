import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VoltOpsPromptManagerImpl } from "./prompt-manager";
import type { VoltOpsClientOptions } from "./types";

describe("prompt cache TTL with the prompt API client", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createManager(promptCache?: VoltOpsClientOptions["promptCache"]) {
    let revision = 0;
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({
        name: "example",
        type: "text",
        version: ++revision,
        prompt: { text: `Revision ${revision}` },
      }),
    );
    const manager = new VoltOpsPromptManagerImpl({
      baseUrl: "https://prompts.example.invalid",
      fetch,
      promptCache,
    });
    return { manager, fetch };
  }

  it.each([0, 1])("refetches a cached prompt with a zero TTL after %i ms", async (elapsed) => {
    const { manager, fetch } = createManager();
    expect((await manager.getPrompt({ promptName: "example" })).text).toBe("Revision 1");
    vi.advanceTimersByTime(elapsed);

    const refreshed = await manager.getPrompt({
      promptName: "example",
      promptCache: { ttl: 0 },
    });

    expect(refreshed.text).toBe("Revision 2");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not reuse a global zero-TTL entry in the same millisecond", async () => {
    const { manager, fetch } = createManager({ ttl: 0 });
    await manager.getPrompt({ promptName: "example" });
    const refreshed = await manager.getPrompt({ promptName: "example" });

    expect(refreshed.text).toBe("Revision 2");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not reuse a per-prompt zero-TTL entry in the same millisecond", async () => {
    const { manager, fetch } = createManager();
    const reference = { promptName: "example", promptCache: { ttl: 0 } };
    await manager.getPrompt(reference);
    const refreshed = await manager.getPrompt(reference);

    expect(refreshed.text).toBe("Revision 2");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("allows a positive per-prompt TTL to override a global zero TTL", async () => {
    const { manager, fetch } = createManager({ ttl: 0 });
    const reference = { promptName: "example", promptCache: { ttl: 2 } };
    await manager.getPrompt(reference);
    vi.advanceTimersByTime(1_999);
    expect((await manager.getPrompt(reference)).text).toBe("Revision 1");
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2);
    expect((await manager.getPrompt(reference)).text).toBe("Revision 2");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("keeps the default TTL when no override is supplied", async () => {
    const { manager, fetch } = createManager();
    const reference = { promptName: "example" };
    await manager.getPrompt(reference);
    vi.advanceTimersByTime(299_999);
    expect((await manager.getPrompt(reference)).text).toBe("Revision 1");
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2);
    expect((await manager.getPrompt(reference)).text).toBe("Revision 2");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("keeps a positive global TTL when no per-prompt override is supplied", async () => {
    const { manager, fetch } = createManager({ ttl: 2 });
    const reference = { promptName: "example" };
    await manager.getPrompt(reference);
    vi.advanceTimersByTime(1_999);
    expect((await manager.getPrompt(reference)).text).toBe("Revision 1");
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2);
    expect((await manager.getPrompt(reference)).text).toBe("Revision 2");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

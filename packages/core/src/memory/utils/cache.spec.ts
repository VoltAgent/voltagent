import { afterEach, describe, expect, it, vi } from "vitest";
import { BatchEmbeddingCache, EmbeddingCache } from "./cache";

describe("EmbeddingCache", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ["Aa", "BB"],
    ["Question: Aa", "Question: BB"],
  ])("does not return the embedding for %s when looking up %s", (first, second) => {
    const cache = new EmbeddingCache();
    cache.set(first, [1, 0]);

    expect(cache.get(second)).toBeNull();
    expect(cache.has(second)).toBe(false);
    expect(cache.get(first)).toEqual([1, 0]);
  });

  it("stores formerly colliding inputs independently", () => {
    const cache = new EmbeddingCache();
    cache.set("Aa", [1, 0]);
    cache.set("BB", [0, 1]);
    cache.set("Aa", [0.5, 0.5]);

    expect(cache.get("Aa")).toEqual([0.5, 0.5]);
    expect(cache.get("BB")).toEqual([0, 1]);
    expect(cache.getStats().size).toBe(2);
  });

  it("evicts the least recently used input at capacity", () => {
    const cache = new EmbeddingCache(2);
    cache.set("Aa", [1, 0]);
    cache.set("BB", [0, 1]);
    expect(cache.get("Aa")).toEqual([1, 0]);
    cache.set("new input", [0.5, 0.5]);

    expect(cache.get("BB")).toBeNull();
    expect(cache.get("Aa")).toEqual([1, 0]);
    expect(cache.get("new input")).toEqual([0.5, 0.5]);
    expect(cache.getStats().size).toBe(2);
  });

  it("expires each cached input independently", () => {
    vi.useFakeTimers();
    const cache = new EmbeddingCache(2, 100);
    cache.set("Aa", [1, 0]);
    vi.advanceTimersByTime(50);
    cache.set("BB", [0, 1]);
    vi.advanceTimersByTime(51);

    expect(cache.get("Aa")).toBeNull();
    expect(cache.get("BB")).toEqual([0, 1]);
    expect(cache.getStats().size).toBe(1);
  });

  it("evicts an empty input when the cache reaches capacity", () => {
    const cache = new EmbeddingCache(1);
    cache.set("", [0, 0]);
    cache.set("Aa", [1, 0]);

    expect(cache.get("")).toBeNull();
    expect(cache.get("Aa")).toEqual([1, 0]);
    expect(cache.getStats().size).toBe(1);
  });
});

describe("BatchEmbeddingCache", () => {
  it("keeps an unseen colliding input in the uncached batch", () => {
    const cache = new BatchEmbeddingCache();
    cache.set("Aa", [1, 0]);

    expect(cache.splitByCached(["BB", "Aa"])).toEqual({
      cached: [{ text: "Aa", embedding: [1, 0], index: 1 }],
      uncached: [{ text: "BB", index: 0 }],
    });
  });

  it("retrieves the correct embeddings after storing colliding inputs in a batch", () => {
    const cache = new BatchEmbeddingCache();
    cache.setBatch(
      ["Aa", "BB"],
      [
        [1, 0],
        [0, 1],
      ],
    );

    expect(cache.getBatch(["BB", "Aa", "missing"])).toEqual([[0, 1], [1, 0], null]);
  });
});

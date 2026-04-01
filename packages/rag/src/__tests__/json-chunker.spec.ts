import { describe, expect, it } from "vitest";
import { JsonChunker } from "../chunkers/json-chunker";

describe("JsonChunker", () => {
  it("walks JSON fields and chunks combined representation", () => {
    const json = JSON.stringify({ user: { name: "alice", age: 30 }, tags: ["a", "b"] });
    const chunker = new JsonChunker();
    const chunks = chunker.chunk(json, { maxTokens: 10 });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]?.metadata?.fields).toBeGreaterThan(0);
  });

  it("falls back to text chunking on invalid JSON", () => {
    const chunker = new JsonChunker();
    const chunks = chunker.chunk("{invalid json", { maxTokens: 2 });
    expect(chunks.length).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";
import { chunkByStrategy } from "../document/transformers";
import { detectFormat } from "../utils/format-detector";

describe("detectFormat", () => {
  it("detects a top-level JSON array", () => {
    expect(detectFormat('[{"id":1},{"id":2}]')).toBe("json");
  });

  it("detects a top-level JSON object", () => {
    expect(detectFormat('{"id":1}')).toBe("json");
  });

  it("falls through when the brackets do not parse as JSON", () => {
    expect(detectFormat("[unclosed]")).toBe("text");
    expect(detectFormat("{not json")).toBe("text");
  });
});

describe("chunkByStrategy auto", () => {
  it("routes a top-level JSON array to the JSON chunker", () => {
    const chunks = chunkByStrategy("auto", '[{"name":"alice"},{"name":"bob"}]');
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]?.metadata?.fields).toBe(2);
    expect(chunks.map((chunk) => chunk.content).join("\n")).toContain("0.name: alice");
  });
});

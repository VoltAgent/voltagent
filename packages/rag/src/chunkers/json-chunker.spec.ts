import { describe, expect, it } from "vitest";
import { JsonChunker } from "./json-chunker";

describe("JsonChunker empty containers", () => {
  it("preserves fields when all values are empty containers", () => {
    const chunks = new JsonChunker().chunk('{"tags":[],"settings":{}}');

    expect(chunks.map((chunk) => chunk.content)).toEqual(["tags: []\nsettings: {}"]);
    expect(chunks[0]?.metadata).toMatchObject({
      fields: 2,
      samplePaths: [
        { path: "tags", line: 1 },
        { path: "settings", line: 2 },
      ],
    });
  });

  it("preserves empty entries inside arrays alongside populated entries", () => {
    const chunks = new JsonChunker().chunk('{"items":[{},[],{"enabled":false},null]}');

    expect(chunks.map((chunk) => chunk.content)).toEqual([
      "items.0: {}\nitems.1: []\nitems.2.enabled: false\nitems.3: null",
    ]);
  });

  it.each(["{}", "[]"])("returns no fields for an empty root %s", (json) => {
    expect(new JsonChunker().chunk(json)).toEqual([]);
  });
});

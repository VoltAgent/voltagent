import { describe, expect, it } from "vitest";

import { normalizeToolInputForModel } from "./tool-input";

describe("normalizeToolInputForModel", () => {
  it("keeps plain object tool inputs", () => {
    const input = { query: "weather" };

    expect(normalizeToolInputForModel(input)).toBe(input);
  });

  it("parses stringified JSON object tool inputs", () => {
    expect(normalizeToolInputForModel('{"query":"weather"}')).toEqual({ query: "weather" });
  });

  it("falls back to an empty object for malformed JSON strings", () => {
    expect(normalizeToolInputForModel(`{"query":"5'7" woman"}`)).toEqual({});
  });

  it("falls back to an empty object for non-dictionary values", () => {
    expect(normalizeToolInputForModel(["weather"])).toEqual({});
    expect(normalizeToolInputForModel("[1,2,3]")).toEqual({});
    expect(normalizeToolInputForModel(null)).toEqual({});
  });
});

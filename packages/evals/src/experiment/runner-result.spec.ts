import { describe, expect, it } from "vitest";
import { normalizeRunnerResult } from "./runner-result.js";

describe("native runner output normalization", () => {
  it("treats a metadata-only object as output, not an envelope", () => {
    const value = { metadata: { label: "answer" } };
    expect(normalizeRunnerResult(value)).toEqual({
      output: value,
      metadata: null,
      traceIds: undefined,
    });
  });

  it("uses presence of output even for undefined, null and falsy values", () => {
    for (const output of [undefined, null, false, 0, ""]) {
      expect(
        normalizeRunnerResult({ output, metadata: { note: true }, traceIds: ["trace"] }),
      ).toEqual({ output, metadata: { note: true }, traceIds: ["trace"] });
    }
  });

  it("retains native inherited-envelope and metadata-copy behavior", () => {
    const value = Object.create({ output: "inherited" });
    value.metadata = { note: true };
    const normalized = normalizeRunnerResult(value);
    expect(normalized.output).toBe("inherited");
    expect(normalized.metadata).toEqual(value.metadata);
    expect(normalized.metadata).not.toBe(value.metadata);
    expect(normalizeRunnerResult({ output: 1, metadata: false } as never).metadata).toBe(null);
    expect(
      normalizeRunnerResult({ output: 1, traceIds: "invalid" } as never).traceIds,
    ).toBeUndefined();
  });
});

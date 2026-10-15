import { describe, expect, it } from "vitest";
import type { Span } from "./api";
import { nodeSummary, spanIO, tokenUsage, valueDiff } from "./span-details";

const span = (attributes: Record<string, unknown>): Span => ({
  traceId: "trace",
  spanId: "span",
  name: "test",
  startTime: "",
  status: { code: 0 },
  attributes,
});
describe("span details", () => {
  it("distinguishes missing usage from a reported zero without counting cached tokens twice", () => {
    expect(tokenUsage(span({})).total).toBeUndefined();
    expect(
      tokenUsage(span({ "usage.prompt_tokens": false, "usage.completion_tokens": " " })).total,
    ).toBeUndefined();
    expect(
      tokenUsage(
        span({
          "llm.usage.prompt_tokens": 10,
          "llm.usage.completion_tokens": 0,
          "llm.usage.cached_tokens": 8,
        }),
      ),
    ).toMatchObject({ total: 10, output: 0, cached: 8 });
    expect(nodeSummary(span({ "llm.model": "demo", "llm.usage.total_tokens": 0 }))).toEqual([
      "demo",
      "0 tokens",
    ]);
  });
  it("preserves false, empty and zero input/output values", () => {
    expect(spanIO(span({ "tool.arguments": false, "tool.output": 0 }))).toEqual({
      input: false,
      output: 0,
    });
    expect(
      spanIO(span({ "voltagent.input": null, "tool.arguments": "fallback", "tool.output": "" })),
    ).toEqual({ input: null, output: "" });
  });
  it("reconstructs both versions from diff rows including inserted and deleted lines", () => {
    for (const [before, after] of [
      ["a\nb\nc", "a\nx\ny\nc"],
      ["same", "same"],
      ["", "added"],
    ]) {
      const diff = valueDiff(before, after);
      expect(
        diff
          .filter((row) => row.type !== "added")
          .map((row) => row.line)
          .join("\n"),
      ).toBe(before);
      expect(
        diff
          .filter((row) => row.type !== "removed")
          .map((row) => row.line)
          .join("\n"),
      ).toBe(after);
    }
  });
});

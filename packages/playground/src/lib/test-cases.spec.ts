import { describe, expect, it } from "vitest";
import type { Trace } from "./api";
import { caseContinuationInput, caseFromTrace, freshCaseDraft } from "./test-cases";

const trace: Trace = {
  traceId: "baseline",
  spanCount: 1,
  spans: [
    {
      traceId: "baseline",
      spanId: "root",
      name: "workflow",
      startTime: "2026-10-13T00:00:00Z",
      endTime: "2026-10-13T00:00:01Z",
      status: { code: 1 },
      attributes: {
        "voltagent.input": false,
        "voltagent.output": 0,
        "agent.context": '{"language":"tr"}',
        "llm.model": "custom-model",
      },
    },
  ],
};

describe("saved test cases", () => {
  it("preserves falsy input and baseline output, without guessing a model override", () => {
    const test = caseFromTrace(trace, "workflow", "test");
    expect(test.input).toBe(false);
    expect(test.baseline.result.output).toBe(0);
    expect(JSON.parse(test.settings.context)).toEqual({ language: "tr" });
    expect(test.settings.model).toBe("");
    expect(test.source).toBe("trace");
  });
  it("uses captured request settings and creates isolated identities without changing the saved case", () => {
    const original = caseFromTrace(trace, "workflow", "test");
    const captured = {
      input: { query: "captured" },
      settings: { ...original.settings, temperature: "0", context: '{"team":"a"}' },
      source: "request" as const,
    };
    const test = caseFromTrace(trace, "workflow", "test", captured);
    const first = freshCaseDraft(test);
    const second = freshCaseDraft(test);
    expect(first.input).toEqual(captured.input);
    expect(first.settings.temperature).toBe("0");
    expect(first.settings.context).toBe(captured.settings.context);
    expect(first.settings.userId).not.toBe(second.settings.userId);
    expect(first.settings.conversationId).not.toBe(test.settings.conversationId);
    expect(test.settings).toEqual(captured.settings);
    expect(test.baseline.traceId).toBe("baseline");
  });
});

it("preserves saved history on a memoryless continuation instead of sending the UI marker", async () => {
  const result = await caseContinuationInput(
    [{ role: "user", content: "Original input" }],
    [
      { id: "marker", role: "user", parts: [{ type: "text", text: "Saved test input" }] },
      { id: "reply", role: "assistant", parts: [{ type: "text", text: "First reply" }] },
      { id: "follow-up", role: "user", parts: [{ type: "text", text: "Continue" }] },
    ],
  );
  expect(result[0]).toEqual({ role: "user", content: "Original input" });
  expect(result).toHaveLength(3);
  expect(result.some((message) => message.content === "Saved test input")).toBe(false);
});

// @vitest-environment jsdom
import { act, createElement } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Span, Trace } from "../lib/api";
import { latestRequestMessage, stepPreview, stepRole } from "../lib/step-preview";
import { StepSummary } from "./inspector";
import { MessagePart, RecordedValue, toolResultValue } from "./recorded-value";
import { UsageDetails } from "./span-details-ai";

let root: Root;
let element: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  element = document.createElement("div");
  root = createRoot(element);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});
const span = (attributes: Record<string, unknown> = {}): Span => ({
  spanId: "tool",
  traceId: "run",
  name: "tool.execute",
  startTime: "2026-01-01T00:00:00Z",
  endTime: "2026-01-01T00:00:01Z",
  status: { code: 1 },
  attributes: { "span.type": "tool", "tool.name": "search_help", ...attributes },
});

it("opens a small tool result immediately and keeps configuration below input and output", async () => {
  const item = span({
    input: { query: "reset link validity" },
    output: [{ id: "reset-password", body: "Expires after 30 minutes." }],
  });
  await act(async () => root.render(createElement(StepSummary, { span: item })));
  const sections = [...element.querySelectorAll<HTMLDetailsElement>(".step-summary > details")];
  expect(sections.map((section) => section.querySelector("summary")?.textContent)).toEqual([
    "Input",
    "Output",
    "Configuration & telemetry",
  ]);
  expect(sections.map((section) => section.open)).toEqual([true, true, false]);
  expect(sections[1].querySelector(".json-leaf")?.textContent).toContain("reset-password");
  expect(sections[1].textContent).toContain("Expires after 30 minutes.");
});

it.each([null, false, 0, ""])("retains a recorded falsy input (%s)", async (input) => {
  const item = span({ input, output: "different output" });
  expect(stepPreview(item)).not.toBe("different output");
  await act(async () => root.render(createElement(StepSummary, { span: item })));
  expect(element.querySelector(".step-summary > details")?.textContent).not.toContain(
    "Not recorded",
  );
});

it("does not eagerly expand large results or deeply nested payloads", async () => {
  const value = Array.from({ length: 100 }, (_, index) => ({ body: `result-${index}` }));
  await act(async () => root.render(createElement(RecordedValue, { value, expandSmall: true })));
  expect(element.querySelectorAll(".json-leaf")).toHaveLength(0);
  expect(element.querySelectorAll('[aria-expanded="false"]')).toHaveLength(50);
  expect(element.textContent).toContain("Show next 50 fields");
});

it("distinguishes repeated tools by query and model calls by their latest message and call number", () => {
  expect(stepPreview(span({ input: { query: "reset password" } }))).toBe("reset password");
  expect(stepPreview(span({ input: { query: "reset link validity" } }))).toBe(
    "reset link validity",
  );
  const messages = [
    { role: "system", content: "Long static instructions" },
    { role: "user", content: "Reset my password" },
    {
      role: "tool",
      content: [{ type: "tool-result", toolName: "search_help", output: "30 minutes" }],
    },
  ];
  const first = span({ "span.type": "llm", "llm.provider_attempt": true });
  const second = {
    ...span({ "span.type": "llm", "llm.provider_attempt": true, "llm.messages": messages }),
    spanId: "second",
    startTime: "2026-01-01T00:00:02Z",
  };
  const trace: Trace = { traceId: "run", spans: [first, second], spanCount: 2 };
  expect(stepPreview(second)).toBe("tool: search_help: 30 minutes");
  expect(stepPreview(second)).not.toContain("static instructions");
  expect(latestRequestMessage(messages)).toEqual(messages[2]);
  expect(stepRole(second, trace)).toBe("Model · Call 2");
});

it("labels missing per-call usage separately from context estimates and agent totals", async () => {
  const call = span({
    "span.type": "llm",
    "llm.provider_attempt": true,
    "usage.prompt_context.total_tokens_estimated": 208,
  });
  const agent = {
    ...span({ "span.type": "agent", "usage.prompt_tokens": 363, "usage.completion_tokens": 92 }),
    spanId: "agent",
  };
  const trace: Trace = {
    traceId: "run",
    spans: [agent, { ...call, parentSpanId: "agent" }],
    spanCount: 2,
  };
  await act(async () =>
    root.render(createElement(UsageDetails, { span: call, trace, compact: true })),
  );
  expect(element.querySelector("summary")?.textContent).toBe("This call · usage not recorded");
  expect(element.textContent).toContain("Context estimate (not usage)");
  expect(element.textContent).toContain("~208");
  expect(element.textContent).not.toContain("455");
  await act(async () =>
    root.render(createElement(UsageDetails, { span: agent, trace, compact: true })),
  );
  expect(element.querySelector("summary")?.textContent).toContain("Agent total · 455 tokens");
});

it("shows the value of AI SDK tool results and keeps call identities behind a disclosure", async () => {
  const value = {
    type: "tool-result",
    toolName: "search_help",
    toolCallId: "call-id",
    output: { type: "json", value: [{ body: "Reset link expires in 30 minutes" }] },
  };
  await act(async () => root.render(createElement(MessagePart, { value })));
  expect(element.querySelector(".json-leaf")?.textContent).toContain(
    "Reset link expires in 30 minutes",
  );
  expect(element.querySelector<HTMLDetailsElement>(".recorded-tool-identity")?.open).toBe(false);
  expect(toolResultValue({ type: "json", value: null })).toBeNull();
  expect(toolResultValue({ type: "text", value: "" })).toBe("");
  expect(toolResultValue({ type: "custom", value: false })).toEqual({
    type: "custom",
    value: false,
  });
});

// @vitest-environment jsdom
import { type ReactNode, act, createElement } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Span, Trace } from "../lib/api";
import { nodeValuePreview, spanCardContent } from "../lib/node-content";
import { spanLabel } from "../lib/trace-presentation";
import { SpanNodeContent } from "./span-node-content";

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
const render = async (node: ReactNode) => act(async () => root.render(node));
const span = (kind: string, attributes: Record<string, unknown> = {}): Span => ({
  spanId: "node",
  traceId: "trace",
  name: kind,
  startTime: "2026-01-01T00:00:00Z",
  endTime: "2026-01-01T00:00:01Z",
  status: { code: 1 },
  attributes: { "span.type": kind, ...attributes },
});
const card = (item: Span, trace?: Trace) =>
  createElement(SpanNodeContent, {
    span: item,
    trace,
    content: spanCardContent(item, trace),
    detailed: false,
  });

it("shows real model names and keeps provider call order separate from retry attempts", () => {
  const first = span("llm", {
    "llm.model": "gpt-4o-mini",
    "llm.provider_attempt": true,
    "llm.attempt": 1,
  });
  const next = { ...first, spanId: "next", startTime: "2026-01-01T00:00:02Z" };
  const trace = { traceId: "trace", spans: [next, first], spanCount: 2 };
  expect(spanLabel(next, trace.spans)).toBe("gpt-4o-mini");
  expect(spanCardContent(next, trace).role).toBe("Model · Call 2");
  expect(spanCardContent(next, trace).fields).toContainEqual({ label: "Attempt", value: 1 });
  next.attributes["llm.model"] = undefined;
  expect(spanLabel(next, trace.spans)).toBe("Model call 2");
});

it("keeps essential agent data visible by default without attributing parent tokens to a model call", async () => {
  const agent = span("agent", {
    "ai.model.name": "gpt-4o-mini",
    "usage.prompt_tokens": 20,
    "usage.completion_tokens": 5,
    "agent.instructions": "Cite the help article.",
    input: [{ role: "user", content: "Help with reset" }],
    output: "Use the reset link",
    "agent.stateSnapshot": { tools: [{ name: "search_help" }] },
  });
  const call = {
    ...span("llm", {
      "llm.model": "gpt-4o-mini",
      "llm.provider_attempt": true,
      "llm.operation": "streamText",
      "llm.max_output_tokens": 500,
      "llm.finish_reason": "stop",
    }),
    spanId: "call",
    parentSpanId: agent.spanId,
  };
  const trace = { traceId: "trace", spans: [agent, call], spanCount: 2 };
  await render(card(agent, trace));
  for (const text of [
    "gpt-4o-mini",
    "search_help",
    "25 tokens",
    "20 in / 5 out",
    "user: Help with reset",
    "Use the reset link",
    "Cite the help article.",
  ])
    expect(element.textContent).toContain(text);
  await render(card(call, trace));
  for (const text of ["streamText", "500", "stop", "Token usage not recorded for this call"])
    expect(element.textContent).toContain(text);
  expect(element.textContent).not.toContain("25 tokens");
});

it("shows tool purpose, schema and exact falsy payloads in the default card", async () => {
  const item = span("tool", {
    "tool.name": "lookup",
    "tool.display_name": "Customer lookup",
    "tool.description": "Look up a fictional customer",
    "tool.scopes": ["router"],
    input: false,
    output: 0,
    "tool.parameters": {
      type: "object",
      properties: { customerId: { type: "string" } },
      required: ["customerId"],
    },
  });
  expect(spanLabel(item)).toBe("Customer lookup");
  await render(card(item));
  for (const text of [
    "lookup",
    "Look up a fictional customer",
    "router",
    "InputExpandfalse",
    "OutputExpand0",
    "customerId*: string",
  ])
    expect(element.textContent).toContain(text);
  expect(element.querySelectorAll(".node-value summary")).toHaveLength(4);
});

it.each([
  [
    "memory",
    {
      "memory.operation": "read",
      "memory.storage.adapter": "libsql",
      "memory.message_count": 0,
      input: "history",
      output: [],
    },
    ["libsql", "Messages0", "history"],
  ],
  [
    "working-memory",
    {
      "memory.working.scope": "conversation",
      "memory.working.format": "markdown",
      "memory.working.content": "Prefers Turkish",
    },
    ["conversation", "markdown", "Prefers Turkish"],
  ],
  [
    "retriever",
    {
      "retriever.description": "Search help",
      "retriever.results.count": 2,
      input: "password",
      output: ["reset", "expire"],
    },
    ["Query", "Results", "password", "Search help"],
  ],
  [
    "embedding",
    {
      "embedding.model": "text-embedding",
      "embedding.dimensions": 3,
      input: "hello",
      output: [0, 1, 0],
    },
    ["text-embedding", "Dimensions3", "Text input", "Vector output"],
  ],
  [
    "vector",
    { "vector.provider": "libsql", "vector.operation": "search", input: [0, 1], output: [] },
    ["libsql", "search", "Results"],
  ],
  [
    "guardrail",
    {
      "guardrail.direction": "input",
      "guardrail.action": "modify",
      "guardrail.reason": "PII removed",
      "guardrail.input.original": "secret",
      "guardrail.input.after": "[redacted]",
    },
    ["modify", "PII removed", "Before", "After", "[redacted]"],
  ],
  [
    "middleware",
    {
      "middleware.direction": "output",
      "middleware.operation": "streamText",
      "middleware.output.current": "before",
      "middleware.output.after": "after",
    },
    ["streamText", "Before", "After"],
  ],
  [
    "scorer",
    {
      "eval.scorer.description": "Answer quality",
      "eval.scorer.sampling.applied": false,
      "eval.scorer.sampling.rate": 0,
      "eval.input": "question",
      "eval.output": "answer",
    },
    ["Answer quality", "Sampling rate0", "Sampling appliedNo", "question", "answer"],
  ],
  [
    "summary",
    {
      "agent.summary.action": "update",
      "agent.summary.keep_messages": 4,
      "agent.summary.text": "User prefers Turkish",
    },
    ["update", "Retained messages4", "User prefers Turkish"],
  ],
  [
    "delegate",
    {
      "subagent.name": "Researcher",
      "planagent.task.status": "completed",
      "planagent.task.response_preview": "Found three sources",
      bailed: true,
    },
    ["Researcher", "completed", "Found three sources", "BailedYes"],
  ],
  [
    "workflow",
    { input: { ticket: "T1" }, output: null, "workflow.retry.attempts": 2 },
    ["Workflow attempts2", "T1", "OutputExpandnull"],
  ],
  [
    "workflow-step",
    {
      "workflow.step.type": "loop",
      "workflow.step.index": 0,
      "workflow.step.loop_iteration": 1,
      input: false,
      output: true,
    },
    ["Step1", "Iteration2", "InputExpandfalse", "OutputExpandtrue"],
  ],
  [
    "tool",
    {
      "tool.name": "read_file",
      "workspace.fs.path": "/notes.md",
      "workspace.fs.bytes": 24,
      output: "notes",
    },
    ["/notes.md", "Bytes24", "notes"],
  ],
  [
    "custom-operation",
    { "cache.hit": false, "cache.key": "example" },
    ["Recorded attributes", "cache.hit", "example"],
  ],
] as const)(
  "renders the relevant %s facts and payloads without enabling detailed cards",
  async (kind, attributes, expected) => {
    await render(card(span(kind, attributes)));
    for (const text of expected) expect(element.textContent).toContain(text);
  },
);

it("keeps message roles and tool arguments understandable, including empty and null values", () => {
  expect(
    nodeValuePreview([
      {
        role: "assistant",
        parts: [
          { type: "step-start" },
          { type: "tool-lookup", input: null, state: "input-available" },
        ],
      },
    ]),
  ).toBe("assistant: lookup: null");
  expect(
    nodeValuePreview([
      { role: "assistant", content: [{ type: "tool-call", toolName: "lookup", input: false }] },
    ]),
  ).toBe("assistant: lookup: false");
  expect(nodeValuePreview(null)).toBe("null");
  expect(nodeValuePreview("")).toBe('""');
});

// @vitest-environment jsdom
import { type ReactNode, act, createElement } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Span } from "../lib/api";
import { JsonTree, MessageList, RecordedValue } from "./recorded-value";
import { SpanDetailsAI, UsageDetails, ValueChange } from "./span-details-ai";

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
const click = async (label: string) => {
  const button = [...element.querySelectorAll("button")].find((item) => item.textContent === label);
  if (!button) throw new Error(`Missing button: ${label}`);
  await act(async () => button.click());
};
const span = (attributes: Record<string, unknown>): Span => ({
  spanId: "span",
  traceId: "trace",
  name: "Agent",
  startTime: "2026-01-01T00:00:00Z",
  endTime: "2026-01-01T00:00:01Z",
  status: { code: 1 },
  attributes,
});

it("renders recorded tool messages read-only, including falsy input and output", async () => {
  await render(
    createElement(MessageList, {
      messages: [
        {
          role: "assistant",
          parts: [
            { type: "reasoning", text: "Consider weather" },
            {
              type: "tool-weather",
              toolCallId: "call-1",
              state: "output-available",
              input: false,
              output: 0,
            },
            { type: "text", text: "**Sunny**" },
          ],
        },
      ],
    }),
  );
  expect(element.textContent).toContain("call-1");
  expect(element.textContent).toContain("Inputvaluefalse");
  expect(element.textContent).toContain("Outputvalue0");
  expect(element.querySelector("strong")?.textContent).toBe("assistant");
  expect(element.querySelector(".markdown strong")?.textContent).toBe("Sunny");
  expect(element.querySelector(".recorded-reasoning")?.hasAttribute("open")).toBe(false);
  expect([...element.querySelectorAll("button")].map((button) => button.textContent)).toEqual([
    "Copy message",
  ]);
});

it("distinguishes absent, null and empty recorded values", async () => {
  await render(createElement(RecordedValue, { value: null }));
  expect(element.textContent).toContain("null");
  await render(createElement(RecordedValue, { value: undefined }));
  expect(element.textContent).toBe("Not recorded");
  await render(createElement(RecordedValue, { value: "" }));
  expect(element.textContent).toBe("Empty string");
  await render(createElement(JsonTree, { value: { note: "", count: 0, empty: null } }));
  expect(element.textContent).toContain('note""');
  expect(element.textContent).toContain("count0");
  expect(element.textContent).toContain("emptynull");
});

it("expands nested JSON on demand instead of flattening large payloads", async () => {
  await render(createElement(JsonTree, { value: { request: '{"nested":"useful details"}' } }));
  expect(element.textContent).not.toContain("useful details");
  const branch = [...element.querySelectorAll("button")].find((button) =>
    button.textContent?.includes("request"),
  );
  if (!branch) throw new Error("Missing request branch");
  await act(async () => branch.click());
  expect(element.textContent).toContain("useful details");
});

it("switches between original, final and diff without losing empty values", async () => {
  await render(
    createElement(ValueChange, { title: "Working memory", before: "", after: "Saved note" }),
  );
  expect(element.querySelector(".value-diff .added")?.textContent).toBe("+Saved note");
  await click("initial");
  expect(element.textContent).toContain("Empty string");
  await click("final");
  expect(element.textContent).toContain("Saved note");
  expect(element.querySelector(".value-diff")).toBeNull();
});

it("renders failed spans, instructions, parameters and recorded context", async () => {
  const failed = span({
    "error.message": "Tool failed",
    "error.stack": "at get_weather",
    "agent.instructions": "Answer in Turkish",
    "agent.context": '{"language":"tr"}',
    "tool.parameters": {
      type: "object",
      properties: { city: { type: "string" } },
      required: ["city"],
    },
    "guardrail.output.original": "before",
    "guardrail.output.after": "after",
  });
  await render(createElement(SpanDetailsAI, { span: failed }));
  expect(element.querySelector(".error-box")?.textContent).toBe("Tool failed");
  expect(element.querySelector(".error-stack")?.textContent).toBe("at get_weather");
  expect(element.textContent).toContain("Answer in Turkish");
  expect(element.textContent).toContain("languagetr");
  expect(element.querySelector(".parameter-list strong")?.textContent).toBe("city *");
  expect(element.querySelector(".parameter-list code")?.textContent).toBe("string");
  expect(element.querySelector(".value-diff .removed")?.textContent).toBe("−before");
});

it("does not double-count cache usage or render a NaN bar for empty usage", async () => {
  await render(
    createElement(UsageDetails, {
      span: span({
        "llm.usage.prompt_tokens": 10,
        "llm.usage.completion_tokens": 5,
        "llm.usage.cached_tokens": 8,
      }),
    }),
  );
  expect(element.querySelector(".ai-section-label strong")?.textContent).toBe("15");
  await render(
    createElement(UsageDetails, {
      span: span({
        "llm.usage.prompt_tokens": 0,
        "llm.usage.completion_tokens": 0,
        "llm.usage.total_tokens": 1,
      }),
    }),
  );
  expect(element.querySelector(".usage-bar")).toBeNull();
});

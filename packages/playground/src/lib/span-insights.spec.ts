import { safeStringify } from "@voltagent/internal";
import { describe, expect, it } from "vitest";
import type { Span, Trace } from "./api";
import {
  extraMessageSets,
  insightSections,
  messageSets,
  modelNames,
  ownedModelSpans,
  parameterRows,
  parseRecorded,
  promptContext,
  recordedNumber,
  spanError,
} from "./span-insights";

const span = (id: string, attributes: Record<string, unknown>, parentSpanId?: string): Span => ({
  traceId: "trace",
  spanId: id,
  name: id,
  startTime: "2026-01-01T00:00:00Z",
  status: { code: 0 },
  attributes,
  parentSpanId,
});

describe("recorded span insights", () => {
  it("keeps extra message representations but does not repeat input messages", () => {
    const input = [{ role: "user", content: "hello" }];
    const ui = [{ role: "user", parts: [{ type: "text", text: "hello" }] }];
    expect(
      extraMessageSets(
        span("model", { "llm.messages": safeStringify(input), "agent.messages.ui": ui }),
      ),
    ).toEqual([{ label: "UI messages", messages: ui }]);
    expect(extraMessageSets(span("model", { "llm.messages": input }))).toEqual([]);
  });
  it("keeps false, zero and malformed payloads without inventing numeric usage", () => {
    expect(parseRecorded("false")).toBe(false);
    expect(parseRecorded('{"incomplete":')).toBe('{"incomplete":');
    for (const value of [null, false, "", " ", {}, "NaN", Number.POSITIVE_INFINITY]) {
      expect(recordedNumber(value)).toBeUndefined();
    }
    expect(recordedNumber("0")).toBe(0);
    expect(
      insightSections(
        span("tool", {
          "llm.temperature": 0,
          "llm.stream": false,
          "tool.tags": '["local"]',
        }),
      ),
    ).toEqual([
      {
        title: "Model",
        fields: [
          { label: "Streaming", value: false },
          { label: "Temperature", value: 0 },
        ],
      },
      { title: "Tool", fields: [{ label: "Tags", value: ["local"] }] },
    ]);
  });

  it("counts provider requests once and excludes child agents and other traces", () => {
    const root = span("root", { "span.type": "agent" });
    const llm = (id: string, parent: string, total: number, attempt = false) =>
      span(
        id,
        {
          "span.type": "llm",
          "llm.provider_attempt": attempt,
          "llm.model": id,
          "usage.prompt_context.total_tokens_estimated": total,
        },
        parent,
      );
    const spans = [
      root,
      llm("wrapper", "root", 999),
      llm("one", "root", 10, true),
      llm("two", "root", 20, true),
      span("child", { "span.type": "agent" }, "root"),
      llm("child-call", "child", 100, true),
      { ...llm("foreign", "root", 100, true), traceId: "other" },
    ];
    const trace: Trace = { traceId: "trace", spans, spanCount: spans.length };
    expect(ownedModelSpans(root, trace).map((item) => item.spanId)).toEqual(["one", "two"]);
    expect(promptContext(root, trace)).toEqual({
      calls: 2,
      total: 30,
      system: undefined,
      messages: undefined,
      tools: undefined,
    });
    expect(modelNames(root, trace)).toEqual(["one", "two"]);
    // A provider attempt can also be nested directly under its wrapper.
    spans[2].parentSpanId = "wrapper";
    spans[3].parentSpanId = "wrapper";
    expect(promptContext(root, trace)?.total).toBe(30);
  });

  it("uses direct estimates, including reported zero, and handles old model spans", () => {
    const root = span("root", { "span.type": "agent" });
    const model = span(
      "model",
      { "span.type": "llm", "usage.prompt_context.total_tokens_estimated": 50 },
      "root",
    );
    const trace = { traceId: "trace", spans: [root, model], spanCount: 2 };
    expect(promptContext(root, trace)?.total).toBe(50);
    root.attributes["usage.prompt_context.total_tokens_estimated"] = 0;
    expect(promptContext(root, trace)).toMatchObject({ calls: 1, total: 0 });
    expect(promptContext(span("empty", {}))).toBeUndefined();
  });

  it("extracts exception events when no error attributes were recorded", () => {
    const failed = span("failed", {});
    failed.events = [
      {
        name: "exception",
        attributes: {
          "exception.message": "Declined",
          "exception.type": "Error",
          "exception.stacktrace": "at execute",
        },
      },
    ];
    expect(spanError(failed)).toEqual({ message: "Declined", type: "Error", stack: "at execute" });
    failed.attributes["error.message"] = "More specific";
    expect(spanError(failed).message).toBe("More specific");
  });

  it("reads UI and model messages while retaining raw malformed attributes", () => {
    expect(
      messageSets(
        span("agent", {
          "agent.messages.ui": safeStringify([
            { role: "user", parts: [{ type: "text", text: "Hi" }] },
          ]),
          "agent.messages.model": [{ role: "user", content: "Hi" }],
          "llm.messages": "truncated…",
        }),
      ).map((set) => set.label),
    ).toEqual(["UI messages", "Model messages"]);
  });

  it("reads required JSON Schema fields and optional serialized Zod fields", () => {
    expect(
      parameterRows({
        type: "object",
        required: ["city"],
        properties: {
          city: { type: "string", description: "Destination" },
          unit: { type: "string", enum: ["c", "f"] },
        },
      }),
    ).toEqual([
      {
        name: "city",
        type: "string",
        description: "Destination",
        required: true,
        choices: undefined,
      },
      {
        name: "unit",
        type: "string",
        choices: ["c", "f"],
        required: false,
        description: undefined,
      },
    ]);
    expect(
      parameterRows(
        safeStringify({
          def: {
            type: "object",
            shape: {
              city: { def: { type: "string" } },
              count: { def: { type: "optional", innerType: { def: { type: "number" } } } },
            },
          },
        }),
      ).map(({ name, type, required }) => ({ name, type, required })),
    ).toEqual([
      { name: "city", type: "string", required: true },
      { name: "count", type: "number", required: false },
    ]);
    expect(parameterRows("unavailable")).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import type { Span, Trace } from "./api";
import { filterLogs, mergeLogs, mergeSpan, mergeTraces, waterfallRows } from "./live";

const span = (id: string, traceId = "selected", parentSpanId?: string): Span => ({
  spanId: id,
  traceId,
  parentSpanId,
  name: id,
  startTime: "2026-01-01T00:00:00Z",
  status: { code: 0 },
  attributes: {},
});
describe("live observability", () => {
  it("buffers orphan child spans until their matching root is known, excluding other agents", () => {
    const child = span("child", "selected", "root");
    const unrelated = span("other-child", "other", "other-root");
    const root = { ...span("root"), attributes: { "entity.id": "agent", "entity.type": "agent" } };
    expect(mergeTraces([], [child, unrelated], "agent", "agent")).toEqual([]);
    expect(
      mergeTraces([], [child, unrelated, root], "agent", "agent")[0].spans.map(
        (item) => item.spanId,
      ),
    ).toEqual(["child", "root"]);
  });
  it("updates changed end attributes without reopening spans when stale starts arrive", () => {
    const started = { ...span("root"), attributes: { value: "old" } };
    const ended = {
      ...started,
      endTime: "2026-01-01T00:00:02Z",
      status: { code: 2 },
      attributes: { value: "new", output: false },
    };
    expect(mergeSpan(started, ended)).toEqual(ended);
    expect(mergeSpan(ended, started)).toEqual(ended);
  });
  it("deduplicates logs and filters severity and attributes", () => {
    const log = {
      timestamp: "2026-01-01T00:00:00Z",
      severityText: "WARN",
      body: "retrying",
      attributes: { tool: "weather" },
    };
    expect(mergeLogs([log, log])).toEqual([log]);
    expect(filterLogs([log], "warn", "WEATHER")).toEqual([log]);
    expect(filterLogs([log], "error", "")).toEqual([]);
  });
  it("uses overlapping elapsed times and safely handles parent cycles in waterfalls", () => {
    const trace: Trace = {
      traceId: "selected",
      spanCount: 2,
      spans: [
        { ...span("a", "selected", "b"), endTime: "2026-01-01T00:00:04Z" },
        {
          ...span("b", "selected", "a"),
          startTime: "2026-01-01T00:00:01Z",
          endTime: "2026-01-01T00:00:03Z",
        },
      ],
    };
    const rows = waterfallRows(trace, Date.now());
    expect(rows[1]).toMatchObject({ left: 25, width: 50, duration: 2000, depth: 1 });
  });
});

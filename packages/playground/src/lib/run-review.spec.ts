import { expect, it } from "vitest";
import type { Span, Trace } from "./api";
import { runFindings } from "./run-review";

const span = (id: string, attributes: Record<string, unknown> = {}, failed = false): Span => ({
  traceId: "run",
  spanId: id,
  parentSpanId: id === "root" ? undefined : "root",
  name: id,
  startTime: "2026-01-01T00:00:00Z",
  endTime: "2026-01-01T00:00:01Z",
  status: { code: failed ? 2 : 1 },
  attributes,
});
const trace = (spans: Span[]): Trace => ({ traceId: "run", spans, spanCount: spans.length });

it("finds failed scorer thresholds even when the run completed", () => {
  const findings = runFindings(
    trace([
      span("root"),
      span("quality", {
        "eval.scorer.threshold_passed": false,
        "eval.scorer.score": 0.2,
        "eval.scorer.threshold": 0.8,
      }),
    ]),
  );
  expect(findings[0]).toMatchObject({ tone: "error", title: "Quality check failed: quality" });
  expect(findings[0].detail).toContain("0.2");
});
it("identifies leaf errors instead of repeating propagated parent errors", () => {
  const findings = runFindings(
    trace([span("root", {}, true), span("parse", { "error.message": "Invalid input" }, true)]),
  );
  expect(findings).toHaveLength(1);
  expect(findings[0].span.spanId).toBe("parse");
});
it("keeps recovered failures separate from unrelated errors", () => {
  const findings = runFindings(
    trace([
      span("root", {}, true),
      span("attempt-1", { "llm.provider_attempt": true, "llm.attempt": 1 }, true),
      {
        ...span("attempt-2", { "llm.provider_attempt": true, "llm.attempt": 2 }),
        startTime: "2026-01-01T00:00:02Z",
      },
      span("tool", { "error.message": "Tool failed" }, true),
    ]),
  );
  expect(
    findings.filter((finding) => finding.tone === "error").map((finding) => finding.span.spanId),
  ).toEqual(["tool"]);
  expect(findings.some((finding) => finding.title.startsWith("Retry succeeded"))).toBe(true);
});
it("does not attribute previous run failures to the selected run", () => {
  expect(
    runFindings(trace([span("root"), { ...span("old", {}, true), traceId: "previous" }])),
  ).toEqual([]);
});
it("explains cancellation and step limits without reporting normal success", () => {
  expect(runFindings(trace([span("root", { "agent.state": "cancelled" })]))[0].title).toBe(
    "Execution cancelled",
  );
  expect(
    runFindings(
      trace([
        span("root", {
          "voltagent.stopped_by_max_steps": true,
          "voltagent.step_count": 2,
          "voltagent.max_steps": 2,
        }),
      ]),
    )[0].title,
  ).toBe("Step limit reached");
});

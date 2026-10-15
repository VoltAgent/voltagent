import { describe, expect, it } from "vitest";
import type { Span, Trace } from "./api";
import { checkRun } from "./test-checks";

const root: Span = {
  traceId: "run",
  spanId: "root",
  name: "agent",
  startTime: "2026-01-01T00:00:00Z",
  endTime: "2026-01-01T00:00:01Z",
  status: { code: 1 },
  attributes: { output: "A useful answer" },
};
const trace = (spans = [root]): Trace => ({ traceId: "run", spans, spanCount: spans.length });

describe("explicit run checks", () => {
  it("separates completed execution from failed output expectations", () => {
    expect(
      checkRun(trace(), { status: "success", outputIncludes: "refund" }).map(
        (check) => check.status,
      ),
    ).toEqual(["passed", "failed"]);
    expect(checkRun(trace())).toEqual([]);
  });
  it.each([false, 0, null, ""])(
    "checks recorded falsy output %s without treating it as missing",
    (output) => {
      const text = output === "" ? '""' : String(output);
      // Empty string remains a recorded value even if a non-empty expectation fails.
      const checks = checkRun(trace([{ ...root, attributes: { output } }]), {
        outputIncludes: text,
      });
      expect(checks[0].status).toBe(output === "" ? "failed" : "passed");
    },
  );
  it("marks missing output and missing root unavailable", () => {
    expect(
      checkRun(trace([{ ...root, attributes: {} }]), { outputIncludes: "answer" })[0].status,
    ).toBe("unavailable");
    expect(checkRun(trace([]), { status: "success" })[0].status).toBe("unavailable");
  });
  it("waits for running, suspended and approval traces", () => {
    for (const attributes of [
      {},
      { "workflow.state": "suspended" },
      { "playground.pending_action": { approval: ["tool"] } },
    ]) {
      const checks = checkRun(trace([{ ...root, endTime: undefined, attributes }]), {
        status: "success",
        outputIncludes: "answer",
        tools: ["search"],
      });
      expect(checks.every((check) => check.status === "pending")).toBe(true);
    }
  });
  it("does not count tool calls from a linked previous trace", () => {
    const tool: Span = {
      ...root,
      spanId: "tool",
      parentSpanId: "root",
      name: "tool.search",
      traceId: "previous",
      attributes: { "voltagent.type": "tool", "tool.name": "search" },
    };
    expect(checkRun(trace([root, tool]), { tools: ["search"] })[0].status).toBe("failed");
    expect(
      checkRun(trace([root, { ...tool, traceId: "run", status: { code: 2 } }]), {
        tools: ["search"],
      })[0].status,
    ).toBe("passed");
  });
  it("supports expected errors without silently considering them completed", () => {
    const failed = trace([{ ...root, status: { code: 2 } }]);
    expect(checkRun(failed, { status: "error" })[0].status).toBe("passed");
    expect(checkRun(failed, { status: "success" })[0].status).toBe("failed");
  });
});

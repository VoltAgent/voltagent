// @vitest-environment jsdom
import { Blob } from "node:buffer";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import type { Trace } from "../lib/api";
import { RunDebug } from "./run-debug";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("prepares a local debug file with linked traces and explicit missing-log errors", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("Blob", Blob);
  const createObjectURL = vi.fn((_blob: Blob) => "blob:debug");
  const revokeObjectURL = vi.fn();
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
  const fetch = vi.fn(async (path: string) =>
    path.includes("/parent/")
      ? { ok: false, json: async () => ({ error: "Expired logs" }) }
      : { ok: true, json: async () => ({ data: { logs: [{ body: "Recorded log" }] } }) },
  );
  vi.stubGlobal("fetch", fetch);
  const trace: Trace = {
    traceId: "run",
    spanCount: 2,
    spans: ["run", "parent"].map((traceId) => ({
      traceId,
      spanId: traceId,
      name: "agent",
      startTime: "2026-01-01T00:00:00Z",
      endTime: "2026-01-01T00:00:01Z",
      status: { code: 1 },
      attributes: {
        input: false,
        output: 0,
        "playground.pending_action": { approval: ["book"], client: [] },
      },
    })),
  };
  const element = document.createElement("div");
  const root = createRoot(element);
  try {
    await act(async () => root.render(createElement(RunDebug, { trace, traces: [trace] })));
    await act(async () => element.querySelector("button")?.click());
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob | undefined;
    expect(blob).toBeDefined();
    if (!blob) throw new Error("Debug file was not prepared");
    const data = JSON.parse(await blob.text());
    expect(data.trace.spans).toHaveLength(2);
    expect(data.trace.spans[0].attributes).toEqual({ input: false, output: 0 });
    expect(data.browserPendingAction.approval).toEqual(["book"]);
    expect(data.logs).toContainEqual({ traceId: "parent", logs: [], error: "Error: Expired logs" });
    expect(element.querySelector("a")?.download).toBe("voltagent-trace-run.json");
    expect(element.textContent).toContain("Some logs were unavailable");
  } finally {
    await act(async () => root.unmount());
  }
  expect(revokeObjectURL).toHaveBeenCalledWith("blob:debug");
});

it("opens a saved baseline comparison even when its original trace has expired", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const trace: Trace = {
    traceId: "new",
    spanCount: 1,
    spans: [
      {
        traceId: "new",
        spanId: "new",
        name: "workflow",
        startTime: "2026-01-01T00:00:00Z",
        endTime: "2026-01-01T00:00:01Z",
        status: { code: 1 },
        attributes: { input: false, output: 0 },
      },
    ],
  };
  const element = document.createElement("div");
  const root = createRoot(element);
  try {
    await act(async () =>
      root.render(
        createElement(RunDebug, {
          trace,
          traces: [trace],
          caseBaseline: {
            name: "Falsy input",
            traceId: "expired",
            result: {
              status: "Completed",
              duration: 10,
              tokens: undefined,
              tools: 0,
              input: false,
              output: 1,
              settings: { root: {}, modelCalls: [] },
            },
          },
        }),
      ),
    );
    expect(element.querySelector<HTMLDetailsElement>(".run-debug")?.open).toBe(true);
    expect(element.querySelector<HTMLSelectElement>("select")?.value).toBe("__saved_case");
    expect(element.querySelector(".run-comparison")?.textContent).toContain("Completed");
    expect(element.textContent).toContain("does not grade answer quality");
    expect(element.querySelector<HTMLDetailsElement>(".run-organization")?.open).toBe(false);
  } finally {
    await act(async () => root.unmount());
  }
});
